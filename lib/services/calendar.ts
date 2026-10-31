import { CalendarEvent } from '../types';
export type { CalendarEvent };

// In-memory calendar store initialized with default SRE schedule
let calendarEvents: CalendarEvent[] = [
  {
    id: 'EVT-9021',
    title: 'SRE Production Incident Triage',
    description: 'Weekly review of P1/P2 production incidents and root cause mitigations.',
    startTime: 'Today, 14:00 Local Time',
    endTime: 'Today, 14:45 Local Time',
    attendees: ['sre-team@company.internal', 'devops-lead@company.internal'],
    meetUrl: 'https://meet.google.com/sre-prod-trg',
    conferenceId: 'sre-prod-trg',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'EVT-9022',
    title: 'Distributed Tracing & Telemetry Architecture',
    description: 'OpenTelemetry collector pipeline optimization and trace sampling review.',
    startTime: 'Tomorrow, 11:00 Local Time',
    endTime: 'Tomorrow, 12:00 Local Time',
    attendees: ['platform-eng@company.internal'],
    meetUrl: 'https://meet.google.com/arc-tele-opt',
    conferenceId: 'arc-tele-opt',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment(3)}-${segment(4)}-${segment(3)}`;
}

export async function listUpcomingEvents(limit = 5): Promise<CalendarEvent[]> {
  return calendarEvents.slice(0, limit);
}

export interface ProvisionMeetingParams {
  title: string;
  startTime: string;
  endTime?: string;
  attendees?: string[];
  description?: string;
}

export async function provisionCalendarMeeting(
  params: ProvisionMeetingParams
): Promise<CalendarEvent> {
  const meetCode = generateMeetCode();
  const meetUrl = `https://meet.google.com/${meetCode}`;

  const newEvent: CalendarEvent = {
    id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
    title: params.title || 'SRE Architecture Sync',
    description: params.description || 'Session provisioned via JARVIS autonomous agent pipeline.',
    startTime: params.startTime || 'Tomorrow, 15:00 UTC',
    endTime: params.endTime || 'Tomorrow, 15:30 UTC',
    attendees: params.attendees && params.attendees.length > 0 ? params.attendees : ['host@organization.com'],
    meetUrl,
    conferenceId: meetCode,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  // Prepend newly provisioned event so it is highlighted first
  calendarEvents = [newEvent, ...calendarEvents];
  return newEvent;
}
