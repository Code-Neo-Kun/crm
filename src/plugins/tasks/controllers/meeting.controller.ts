/**
 * Meeting Controller
 * Handles HTTP requests for meeting management and scheduling
 */

import { Request, Response } from "express";
import { MeetingService } from "../services/meeting.service";
import {
  CreateMeetingRequest,
  UpdateMeetingRequest,
  SendMeetingInviteRequest,
  RespondToInviteRequest,
} from "../types";

declare global {
  namespace Express {
    interface Request {
      context: {
        userId: number;
        zoneId: number;
        accessibleZones: number[];
        capabilities: string[];
        role: string;
      };
    }
  }
}

export class MeetingController {
  constructor(private meetingService: MeetingService) {}

  /**
   * Create a new meeting
   * POST /api/v1/meetings
   */
  async createMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;

      // Check permission
      if (!req.context.capabilities.includes("meeting:create")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to create meeting",
        });
        return;
      }

      const data: CreateMeetingRequest = req.body;

      const meeting = await this.meetingService.createMeeting(
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        data: meeting,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create meeting",
      });
    }
  }

  /**
   * List all meetings for zone with filtering and pagination
   * GET /api/v1/meetings
   */
  async listMeetings(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const {
        type,
        organizer_id,
        project_id,
        lead_id,
        search,
        start_before,
        start_after,
        page = "1",
        pageSize = "20",
      } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (organizer_id)
        filters.organizer_id = parseInt(organizer_id as string, 10);
      if (project_id) filters.project_id = parseInt(project_id as string, 10);
      if (lead_id) filters.lead_id = parseInt(lead_id as string, 10);
      if (search) filters.search = search as string;
      if (start_before) filters.start_before = start_before as string;
      if (start_after) filters.start_after = start_after as string;

      const pagination = {
        page: Math.max(1, parseInt(page as string, 10) || 1),
        pageSize: Math.min(100, parseInt(pageSize as string, 10) || 20),
      };

      const result = await this.meetingService.listMeetings(
        zoneId,
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.meetings,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to list meetings",
      });
    }
  }

  /**
   * Get single meeting with all details
   * GET /api/v1/meetings/:id
   */
  async getMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      const meeting = await this.meetingService.getMeetingWithDetails(
        meetingId,
        zoneId
      );

      res.json({
        success: true,
        data: meeting,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || "Failed to retrieve meeting",
        });
      }
    }
  }

  /**
   * Update meeting metadata
   * PUT /api/v1/meetings/:id
   */
  async updateMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("meeting:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to update meeting",
        });
        return;
      }

      const data: UpdateMeetingRequest = req.body;

      const meeting = await this.meetingService.updateMeeting(
        meetingId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: meeting,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update meeting",
      });
    }
  }

  /**
   * Send invites to additional attendees
   * POST /api/v1/meetings/:id/invite
   */
  async sendInvites(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("meeting:invite")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to send invites",
        });
        return;
      }

      const data: SendMeetingInviteRequest = req.body;

      const attendees = await this.meetingService.sendInvites(
        meetingId,
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        data: attendees,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to send invites",
      });
    }
  }

  /**
   * Respond to meeting invitation
   * POST /api/v1/meetings/:id/respond
   */
  async respondToInvite(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      const data: RespondToInviteRequest = req.body;

      const attendee = await this.meetingService.respondToInvite(
        meetingId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: attendee,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to respond to invitation",
      });
    }
  }

  /**
   * Get attendee statistics for meeting
   * GET /api/v1/meetings/:id/attendee-stats
   */
  async getAttendeeStats(req: Request, res: Response): Promise<void> {
    try {
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      const stats = await this.meetingService.getAttendeeStats(meetingId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve attendee statistics",
      });
    }
  }

  /**
   * Cancel meeting
   * DELETE /api/v1/meetings/:id
   */
  async cancelMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const meetingId = parseInt(req.params.id, 10);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid meeting ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("meeting:delete")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to delete meeting",
        });
        return;
      }

      await this.meetingService.cancelMeeting(meetingId, zoneId, userId);

      res.json({
        success: true,
        message: "Meeting cancelled successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to cancel meeting",
      });
    }
  }

  /**
   * Get upcoming meetings for current user
   * GET /api/v1/meetings/upcoming/my-meetings
   */
  async getUpcomingMeetings(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const { limit = "10" } = req.query;

      const meetings = await this.meetingService.getUserUpcomingMeetings(
        zoneId,
        userId,
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: meetings,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve upcoming meetings",
      });
    }
  }
}
