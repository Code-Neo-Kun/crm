/**
 * Meeting Service
 * Manages meeting scheduling, attendee management, and RSVP handling
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import {
  Meeting,
  MeetingWithDetails,
  MeetingAttendee,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  SendMeetingInviteRequest,
  RespondToInviteRequest,
  MEETING_TYPES,
  ATTENDEE_STATUS,
  MEETING_VALIDATION_RULES,
} from "../types";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface MeetingFilters {
  type?: MEETING_TYPES;
  organizer_id?: number;
  project_id?: number;
  lead_id?: number;
  search?: string;
  start_after?: string; // ISO timestamp
  start_before?: string; // ISO timestamp
}

interface ListMeetingsResult {
  meetings: MeetingWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class MeetingService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService
  ) {}

  /**
   * Create a new meeting with attendees
   */
  async createMeeting(
    zoneId: number,
    userId: number,
    data: CreateMeetingRequest
  ): Promise<MeetingWithDetails> {
    // Validation
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Meeting title is required");
    }

    if (data.title.length > MEETING_VALIDATION_RULES.title_max_length) {
      throw new Error(
        `Meeting title must not exceed ${MEETING_VALIDATION_RULES.title_max_length} characters`
      );
    }

    if (
      data.description &&
      data.description.length > MEETING_VALIDATION_RULES.description_max_length
    ) {
      throw new Error(
        `Meeting description must not exceed ${MEETING_VALIDATION_RULES.description_max_length} characters`
      );
    }

    if (!Object.values(MEETING_TYPES).includes(data.type)) {
      throw new Error(`Invalid meeting type: ${data.type}`);
    }

    // Validate times
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Invalid start_time or end_time format");
    }

    if (endTime <= startTime) {
      throw new Error("end_time must be after start_time");
    }

    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (durationMinutes < MEETING_VALIDATION_RULES.min_duration_minutes) {
      throw new Error(
        `Meeting duration must be at least ${MEETING_VALIDATION_RULES.min_duration_minutes} minutes`
      );
    }

    const durationHours = durationMinutes / 60;
    if (durationHours > MEETING_VALIDATION_RULES.max_duration_hours) {
      throw new Error(
        `Meeting duration must not exceed ${MEETING_VALIDATION_RULES.max_duration_hours} hours`
      );
    }

    // Validate attendees
    if (
      !data.attendee_ids ||
      data.attendee_ids.length < MEETING_VALIDATION_RULES.min_attendees
    ) {
      throw new Error(
        `Meeting must have at least ${MEETING_VALIDATION_RULES.min_attendees} attendee(s)`
      );
    }

    if (data.attendee_ids.length > MEETING_VALIDATION_RULES.max_attendees) {
      throw new Error(
        `Meeting cannot exceed ${MEETING_VALIDATION_RULES.max_attendees} attendees`
      );
    }

    // Check all attendees exist in zone
    const uniqueAttendees = [...new Set(data.attendee_ids)];
    for (const attendeeId of uniqueAttendees) {
      const userCheck = await this.database.execute(
        `SELECT u.id FROM users u
         JOIN user_zones uz ON u.id = uz.user_id
         WHERE u.id = ? AND uz.zone_id = ?`,
        [attendeeId, zoneId]
      );

      if ((userCheck[0] as any[]).length === 0) {
        throw new Error(`Attendee ${attendeeId} not found in this zone`);
      }
    }

    // Check project if provided
    if (data.project_id) {
      const projectCheck = await this.database.execute(
        "SELECT id FROM projects WHERE id = ? AND zone_id = ?",
        [data.project_id, zoneId]
      );

      if ((projectCheck[0] as any[]).length === 0) {
        throw new Error("Project not found in this zone");
      }
    }

    // Check lead if provided
    if (data.lead_id) {
      const leadCheck = await this.database.execute(
        "SELECT id FROM leads WHERE id = ? AND zone_id = ?",
        [data.lead_id, zoneId]
      );

      if ((leadCheck[0] as any[]).length === 0) {
        throw new Error("Lead not found in this zone");
      }
    }

    // Start transaction for atomicity
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      // Create meeting
      const meetingSql = `
        INSERT INTO meetings (
          zone_id, title, description, type, start_time, end_time,
          location, organizer_id, project_id, lead_id, meeting_link
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const meetingResult = await connection.execute(meetingSql, [
        zoneId,
        data.title.trim(),
        data.description || null,
        data.type,
        data.start_time,
        data.end_time,
        data.location || null,
        userId,
        data.project_id || null,
        data.lead_id || null,
        data.meeting_link || null,
      ]);

      const meetingId = (meetingResult[0] as any).insertId;

      // Add attendees
      const attendeeSql = `
        INSERT INTO meeting_attendees (meeting_id, user_id, status)
        VALUES (?, ?, ?)
      `;

      for (const attendeeId of uniqueAttendees) {
        await connection.execute(attendeeSql, [
          meetingId,
          attendeeId,
          ATTENDEE_STATUS.PENDING,
        ]);
      }

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        zoneId,
        userId,
        action: "create",
        entityType: "meeting",
        entityId: meetingId,
        oldValue: null,
        newValue: {
          title: data.title,
          type: data.type,
          attendee_count: uniqueAttendees.length,
        },
      });

      return this.getMeetingWithDetails(meetingId, zoneId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(
    meetingId: number,
    zoneId: number
  ): Promise<Meeting | null> {
    const sql = `
      SELECT id, zone_id, title, description, type, start_time, end_time,
             location, organizer_id, project_id, lead_id, meeting_link,
             created_at, updated_at
      FROM meetings
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [meetingId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as Meeting;
  }

  /**
   * Get meeting with full details
   */
  async getMeetingWithDetails(
    meetingId: number,
    zoneId: number
  ): Promise<MeetingWithDetails> {
    const meeting = await this.getMeetingById(meetingId, zoneId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Get organizer details
    let organizer;
    if (meeting.organizer_id) {
      const organizerResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [meeting.organizer_id]
      );
      organizer = (organizerResult[0] as any[])[0];
    }

    // Get project details
    let project;
    if (meeting.project_id) {
      const projectResult = await this.database.execute(
        "SELECT id, name FROM projects WHERE id = ? AND zone_id = ?",
        [meeting.project_id, zoneId]
      );
      project = (projectResult[0] as any[])[0];
    }

    // Get lead details
    let lead;
    if (meeting.lead_id) {
      const leadResult = await this.database.execute(
        "SELECT id, name, email FROM leads WHERE id = ? AND zone_id = ?",
        [meeting.lead_id, zoneId]
      );
      const leadData = (leadResult[0] as any[])[0];
      if (leadData) {
        lead = {
          id: leadData.id,
          name: leadData.name || "Unknown",
          email: leadData.email || null,
        };
      }
    }

    // Get attendees with user details
    const attendeesResult = await this.database.execute(
      `SELECT id, meeting_id, user_id, status, responded_at, created_at
       FROM meeting_attendees WHERE meeting_id = ? ORDER BY created_at ASC`,
      [meetingId]
    );

    const attendees: MeetingAttendee[] = [];
    for (const attendee of attendeesResult[0] as any[]) {
      const userResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [attendee.user_id]
      );
      attendees.push({
        ...attendee,
        user: (userResult[0] as any[])[0],
      });
    }

    return {
      ...meeting,
      organizer,
      attendees,
      project,
      lead,
    };
  }

  /**
   * List meetings with pagination and filtering
   */
  async listMeetings(
    zoneId: number,
    filters?: MeetingFilters,
    pagination?: PaginationParams
  ): Promise<ListMeetingsResult> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT id, zone_id, title, description, type, start_time, end_time,
             location, organizer_id, project_id, lead_id, meeting_link,
             created_at, updated_at
      FROM meetings
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.type) {
      sql += " AND type = ?";
      params.push(filters.type);
    }

    if (filters?.organizer_id) {
      sql += " AND organizer_id = ?";
      params.push(filters.organizer_id);
    }

    if (filters?.project_id) {
      sql += " AND project_id = ?";
      params.push(filters.project_id);
    }

    if (filters?.lead_id) {
      sql += " AND lead_id = ?";
      params.push(filters.lead_id);
    }

    if (filters?.search) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters?.start_before) {
      sql += " AND start_time <= ?";
      params.push(filters.start_before);
    }

    if (filters?.start_after) {
      sql += " AND start_time >= ?";
      params.push(filters.start_after);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as count FROM"
    );
    const countResult = await this.database.execute(countSql, params);
    const total = (countResult[0] as any[])[0].count;

    // Get paginated results
    sql += " ORDER BY start_time ASC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const results = await this.database.execute(sql, params);
    const meetings = results[0] as any[] as Meeting[];

    // Hydrate with details
    const meetingsWithDetails: MeetingWithDetails[] = [];
    for (const meeting of meetings) {
      const details = await this.getMeetingWithDetails(meeting.id, zoneId);
      meetingsWithDetails.push(details);
    }

    return {
      meetings: meetingsWithDetails,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update meeting metadata
   */
  async updateMeeting(
    meetingId: number,
    zoneId: number,
    userId: number,
    data: UpdateMeetingRequest
  ): Promise<MeetingWithDetails> {
    const existing = await this.getMeetingById(meetingId, zoneId);
    if (!existing) {
      throw new Error("Meeting not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new Error("Meeting title cannot be empty");
      }
      if (data.title.length > MEETING_VALIDATION_RULES.title_max_length) {
        throw new Error(
          `Meeting title must not exceed ${MEETING_VALIDATION_RULES.title_max_length} characters`
        );
      }
      updates.push("title = ?");
      values.push(data.title.trim());
    }

    if (data.description !== undefined) {
      if (
        data.description &&
        data.description.length >
          MEETING_VALIDATION_RULES.description_max_length
      ) {
        throw new Error(
          `Meeting description must not exceed ${MEETING_VALIDATION_RULES.description_max_length} characters`
        );
      }
      updates.push("description = ?");
      values.push(data.description || null);
    }

    if (data.type !== undefined) {
      if (!Object.values(MEETING_TYPES).includes(data.type)) {
        throw new Error(`Invalid meeting type: ${data.type}`);
      }
      updates.push("type = ?");
      values.push(data.type);
    }

    if (data.start_time !== undefined || data.end_time !== undefined) {
      const startTime = data.start_time
        ? new Date(data.start_time)
        : existing.start_time;
      const endTime = data.end_time
        ? new Date(data.end_time)
        : existing.end_time;

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error("Invalid start_time or end_time format");
      }

      if (endTime <= startTime) {
        throw new Error("end_time must be after start_time");
      }

      const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
      if (durationMinutes < MEETING_VALIDATION_RULES.min_duration_minutes) {
        throw new Error(
          `Meeting duration must be at least ${MEETING_VALIDATION_RULES.min_duration_minutes} minutes`
        );
      }

      if (data.start_time !== undefined) {
        updates.push("start_time = ?");
        values.push(data.start_time);
      }

      if (data.end_time !== undefined) {
        updates.push("end_time = ?");
        values.push(data.end_time);
      }
    }

    if (data.location !== undefined) {
      updates.push("location = ?");
      values.push(data.location || null);
    }

    if (data.meeting_link !== undefined) {
      updates.push("meeting_link = ?");
      values.push(data.meeting_link || null);
    }

    if (updates.length === 0) {
      return this.getMeetingWithDetails(meetingId, zoneId);
    }

    updates.push("updated_at = NOW()");
    values.push(meetingId, zoneId);

    const sql = `UPDATE meetings SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "meeting",
      entityId: meetingId,
      oldValue: existing,
      newValue: data,
    });

    return this.getMeetingWithDetails(meetingId, zoneId);
  }

  /**
   * Send invites to additional attendees
   */
  async sendInvites(
    meetingId: number,
    zoneId: number,
    userId: number,
    data: SendMeetingInviteRequest
  ): Promise<MeetingAttendee[]> {
    const meeting = await this.getMeetingById(meetingId, zoneId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (!data.attendee_ids || data.attendee_ids.length === 0) {
      throw new Error("At least one attendee_id is required");
    }

    // Check all attendees exist in zone
    const uniqueAttendees = [...new Set(data.attendee_ids)];
    for (const attendeeId of uniqueAttendees) {
      const userCheck = await this.database.execute(
        `SELECT u.id FROM users u
         JOIN user_zones uz ON u.id = uz.user_id
         WHERE u.id = ? AND uz.zone_id = ?`,
        [attendeeId, zoneId]
      );

      if ((userCheck[0] as any[]).length === 0) {
        throw new Error(`Attendee ${attendeeId} not found in this zone`);
      }
    }

    // Check if already attendees
    const existingAttendeesResult = await this.database.execute(
      "SELECT user_id FROM meeting_attendees WHERE meeting_id = ?",
      [meetingId]
    );

    const existingIds = (existingAttendeesResult[0] as any[]).map(
      (a) => a.user_id
    );

    const newAttendees = uniqueAttendees.filter(
      (id) => !existingIds.includes(id)
    );

    if (newAttendees.length === 0) {
      throw new Error("All attendees are already invited");
    }

    // Add new attendees
    const sql = `
      INSERT INTO meeting_attendees (meeting_id, user_id, status)
      VALUES (?, ?, ?)
    `;

    const addedAttendees: MeetingAttendee[] = [];
    for (const attendeeId of newAttendees) {
      const result = await this.database.execute(sql, [
        meetingId,
        attendeeId,
        ATTENDEE_STATUS.PENDING,
      ]);

      const attendeeRecordId = (result[0] as any).insertId;

      const userResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [attendeeId]
      );

      addedAttendees.push({
        id: attendeeRecordId,
        meeting_id: meetingId,
        user_id: attendeeId,
        status: ATTENDEE_STATUS.PENDING,
        responded_at: null,
        created_at: new Date(),
        user: (userResult[0] as any[])[0],
      });
    }

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "meeting",
      entityId: meetingId,
      oldValue: { attendee_count: existingIds.length },
      newValue: { attendee_count: existingIds.length + newAttendees.length },
    });

    return addedAttendees;
  }

  /**
   * Respond to meeting invitation
   */
  async respondToInvite(
    meetingId: number,
    zoneId: number,
    userId: number,
    data: RespondToInviteRequest
  ): Promise<MeetingAttendee> {
    const meeting = await this.getMeetingById(meetingId, zoneId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (!Object.values(ATTENDEE_STATUS).includes(data.status)) {
      throw new Error(`Invalid attendee status: ${data.status}`);
    }

    // Get attendee record
    const attendeeResult = await this.database.execute(
      `SELECT id, meeting_id, user_id, status, responded_at, created_at
       FROM meeting_attendees
       WHERE meeting_id = ? AND user_id = ?`,
      [meetingId, userId]
    );

    if ((attendeeResult[0] as any[]).length === 0) {
      throw new Error("User is not invited to this meeting");
    }

    const attendee = (attendeeResult[0] as any[])[0];

    const sql = `
      UPDATE meeting_attendees
      SET status = ?, responded_at = NOW()
      WHERE meeting_id = ? AND user_id = ?
    `;

    await this.database.execute(sql, [data.status, meetingId, userId]);

    // Get user details
    const userResult = await this.database.execute(
      "SELECT id, name, email FROM users WHERE id = ?",
      [userId]
    );

    const updatedAttendee: MeetingAttendee = {
      ...attendee,
      status: data.status,
      responded_at: new Date(),
      user: (userResult[0] as any[])[0],
    };

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "meeting_attendee",
      entityId: attendee.id,
      oldValue: { status: attendee.status },
      newValue: { status: data.status },
    });

    return updatedAttendee;
  }

  /**
   * Get attendee statistics for meeting
   */
  async getAttendeeStats(meetingId: number): Promise<Record<string, number>> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM meeting_attendees
      WHERE meeting_id = ?
      GROUP BY status
    `;

    const results = await this.database.execute(sql, [meetingId]);

    const stats: Record<string, number> = {
      [ATTENDEE_STATUS.PENDING]: 0,
      [ATTENDEE_STATUS.ACCEPTED]: 0,
      [ATTENDEE_STATUS.DECLINED]: 0,
      [ATTENDEE_STATUS.TENTATIVE]: 0,
    };

    for (const row of results[0] as any[]) {
      stats[row.status] = row.count;
    }

    return stats;
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(
    meetingId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const meeting = await this.getMeetingById(meetingId, zoneId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Delete all attendees and meeting
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        "DELETE FROM meeting_attendees WHERE meeting_id = ?",
        [meetingId]
      );

      await connection.execute(
        "DELETE FROM meetings WHERE id = ? AND zone_id = ?",
        [meetingId, zoneId]
      );

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        zoneId,
        userId,
        action: "delete",
        entityType: "meeting",
        entityId: meetingId,
        oldValue: { id: meetingId },
        newValue: null,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get upcoming meetings for user
   */
  async getUserUpcomingMeetings(
    zoneId: number,
    userId: number,
    limit: number = 10
  ): Promise<MeetingWithDetails[]> {
    const sql = `
      SELECT m.id, m.zone_id, m.title, m.description, m.type, m.start_time,
             m.end_time, m.location, m.organizer_id, m.project_id, m.lead_id,
             m.meeting_link, m.created_at, m.updated_at
      FROM meetings m
      INNER JOIN meeting_attendees ma ON m.id = ma.meeting_id
      WHERE m.zone_id = ? AND ma.user_id = ? AND m.start_time > NOW()
      ORDER BY m.start_time ASC
      LIMIT ?
    `;

    const results = await this.database.execute(sql, [zoneId, userId, limit]);

    const meetings = results[0] as any[] as Meeting[];

    const upcomingMeetings: MeetingWithDetails[] = [];
    for (const meeting of meetings) {
      const details = await this.getMeetingWithDetails(meeting.id, zoneId);
      upcomingMeetings.push(details);
    }

    return upcomingMeetings;
  }
}
