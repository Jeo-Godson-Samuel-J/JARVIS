import { NextResponse } from 'next/server';
import { listUpcomingEvents } from '@/lib/services/calendar';

export async function GET() {
  const events = await listUpcomingEvents(10);
  return NextResponse.json({ events });
}
