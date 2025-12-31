/**
 * Task & Meeting Routes
 * Combines task and meeting routes for the tasks plugin
 */

import { Router } from "express";
import { authenticate } from "@core/auth/middleware/authenticate";
import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { TaskController } from "./controllers/task.controller";
import { MeetingController } from "./controllers/meeting.controller";
import { TaskService } from "./services/task.service";
import { MeetingService } from "./services/meeting.service";

const router = Router();

// Middleware
router.use(authenticate);

// Initialize services
const database = DatabaseService.getInstance();
const auditLogger = AuditService.getInstance();

const taskService = new TaskService(database, auditLogger);
const meetingService = new MeetingService(database, auditLogger);

// Initialize controllers
const taskController = new TaskController(taskService);
const meetingController = new MeetingController(meetingService);

// ============================================================================
// TASK ROUTES
// ============================================================================

// GET /api/v1/tasks/stats/by-status - Task statistics
router.get("/tasks/stats/by-status", (req, res) =>
  taskController.getTaskStats(req, res)
);

// GET /api/v1/tasks/overdue - Overdue tasks
router.get("/tasks/overdue", (req, res) =>
  taskController.getOverdueTasks(req, res)
);

// GET /api/v1/tasks/my-assignments - My assigned tasks
router.get("/tasks/my-assignments", (req, res) =>
  taskController.getMyAssignments(req, res)
);

// GET /api/v1/tasks - List all tasks
router.get("/tasks", (req, res) => taskController.listTasks(req, res));

// POST /api/v1/tasks - Create new task
router.post("/tasks", (req, res) => taskController.createTask(req, res));

// GET /api/v1/tasks/:id - Get task details
router.get("/tasks/:id", (req, res) => taskController.getTask(req, res));

// PUT /api/v1/tasks/:id - Update task
router.put("/tasks/:id", (req, res) => taskController.updateTask(req, res));

// POST /api/v1/tasks/:id/complete - Mark task as complete
router.post("/tasks/:id/complete", (req, res) =>
  taskController.markComplete(req, res)
);

// POST /api/v1/tasks/:id/mark-read - Mark task as read
router.post("/tasks/:id/mark-read", (req, res) =>
  taskController.markAsRead(req, res)
);

// POST /api/v1/tasks/:id/comments - Add comment
router.post("/tasks/:id/comments", (req, res) =>
  taskController.addComment(req, res)
);

// DELETE /api/v1/tasks/:id - Cancel task
router.delete("/tasks/:id", (req, res) => taskController.deleteTask(req, res));

// ============================================================================
// MEETING ROUTES
// ============================================================================

// GET /api/v1/meetings/upcoming/my-meetings - My upcoming meetings
router.get("/meetings/upcoming/my-meetings", (req, res) =>
  meetingController.getUpcomingMeetings(req, res)
);

// GET /api/v1/meetings - List all meetings
router.get("/meetings", (req, res) => meetingController.listMeetings(req, res));

// POST /api/v1/meetings - Create new meeting
router.post("/meetings", (req, res) =>
  meetingController.createMeeting(req, res)
);

// GET /api/v1/meetings/:id - Get meeting details
router.get("/meetings/:id", (req, res) =>
  meetingController.getMeeting(req, res)
);

// PUT /api/v1/meetings/:id - Update meeting
router.put("/meetings/:id", (req, res) =>
  meetingController.updateMeeting(req, res)
);

// POST /api/v1/meetings/:id/invite - Send invites
router.post("/meetings/:id/invite", (req, res) =>
  meetingController.sendInvites(req, res)
);

// POST /api/v1/meetings/:id/respond - Respond to invitation
router.post("/meetings/:id/respond", (req, res) =>
  meetingController.respondToInvite(req, res)
);

// GET /api/v1/meetings/:id/attendee-stats - Attendee statistics
router.get("/meetings/:id/attendee-stats", (req, res) =>
  meetingController.getAttendeeStats(req, res)
);

// DELETE /api/v1/meetings/:id - Cancel meeting
router.delete("/meetings/:id", (req, res) =>
  meetingController.cancelMeeting(req, res)
);

export default router;
