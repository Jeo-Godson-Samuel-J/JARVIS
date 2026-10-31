import { NextRequest, NextResponse } from 'next/server';
import { provisionCalendarMeeting, listUpcomingEvents } from '@/lib/services/calendar';
import { recordAuditLog, updateTaskStatus } from '@/lib/services/memory';

export async function GET() {
  const events = await listUpcomingEvents();
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvalId, action, parameters, taskId } = body;

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: 'approvalId and action ("authorize" | "reject") are required' },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      await recordAuditLog('ACTION_REJECTED', 'stage_calendar_meeting', { approvalId });
      if (taskId) {
        await updateTaskStatus(taskId, 'failed', { reason: 'Rejected by operator' });
      }
      return NextResponse.json({
        approvalId,
        status: 'rejected',
        message: 'Action rejected by human operator. Directive aborted.',
      });
    }

    if (action === 'authorize') {
      // Execute the provisioner
      const event = await provisionCalendarMeeting({
        title: parameters?.title || 'SRE Architecture Sync',
        startTime: parameters?.startTime || 'Tomorrow, 15:00 UTC',
        endTime: parameters?.endTime,
        attendees: parameters?.attendees,
        description: parameters?.description,
      });

      await recordAuditLog('ACTION_AUTHORIZED', 'stage_calendar_meeting', {
        approvalId,
        meetUrl: event.meetUrl,
        eventId: event.id,
      });

      if (taskId) {
        await updateTaskStatus(taskId, 'completed', { meetUrl: event.meetUrl });
      }

      return NextResponse.json({
        approvalId,
        status: 'authorized',
        event,
        meetUrl: event.meetUrl,
        message: `Google Meet session provisioned at ${event.meetUrl}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Approval resolution error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to resolve approval' },
      { status: 500 }
    );
  }
}
