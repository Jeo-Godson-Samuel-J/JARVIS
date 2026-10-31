import { listUpcomingEvents } from '../../services/calendar';
import { evaluateToolPolicy } from '../../permissions/policy';
import { ApprovalRequest, CalendarEvent } from '../../types';

export const listUpcomingEventsToolDefinition = {
  name: 'list_upcoming_events',
  description: 'Retrieve upcoming scheduled calendar events, meetings, and Google Meet sessions.',
  parameters: {
    type: 'OBJECT',
    properties: {
      limit: {
        type: 'NUMBER',
        description: 'Maximum number of upcoming events to retrieve (default: 5)',
      },
    },
  },
};

export async function executeListUpcomingEvents(limit = 5): Promise<CalendarEvent[]> {
  return await listUpcomingEvents(limit);
}

export const stageCalendarMeetingToolDefinition = {
  name: 'stage_calendar_meeting',
  description:
    'Stage a new Google Calendar event with a Google Meet conference link for human approval. Use this when the user asks to schedule, book, or setup a meeting, session, or sync.',
  parameters: {
    type: 'OBJECT',
    properties: {
      title: {
        type: 'STRING',
        description: 'Title or subject of the meeting (e.g., "Backend Architecture Review with Alex")',
      },
      startTime: {
        type: 'STRING',
        description: 'Scheduled start date and time (e.g., "Tomorrow, 15:00 UTC" or "2026-10-30T15:00:00Z")',
      },
      endTime: {
        type: 'STRING',
        description: 'Scheduled end time (optional, e.g. "Tomorrow, 15:30 UTC")',
      },
      attendees: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'List of attendee email addresses or names',
      },
      description: {
        type: 'STRING',
        description: 'Agenda or description for the meeting',
      },
    },
    required: ['title', 'startTime'],
  },
};

export interface StagedCalendarAction {
  requiresApproval: true;
  approvalRequest: ApprovalRequest;
}

export function stageCalendarMeeting(params: {
  title: string;
  startTime: string;
  endTime?: string;
  attendees?: string[];
  description?: string;
}): StagedCalendarAction {
  const policy = evaluateToolPolicy('stage_calendar_meeting');
  const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

  const approvalRequest: ApprovalRequest = {
    id: reqId,
    taskId: `TSK-${Math.floor(100 + Math.random() * 900)}`,
    toolName: 'stage_calendar_meeting',
    summary: `Schedule Google Calendar event: "${params.title}" with Google Meet link`,
    parameters: {
      title: params.title,
      startTime: params.startTime,
      endTime: params.endTime || '30 minutes duration',
      attendees: params.attendees || ['organizer@company.com'],
      description: params.description || '',
    },
    riskLevel: policy.riskLevel,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    requiresApproval: true,
    approvalRequest,
  };
}
