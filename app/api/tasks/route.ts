import { NextResponse } from 'next/server';
import { getRecentTasks, getAuditLogs } from '@/lib/services/memory';

export async function GET() {
  const [tasks, auditLogs] = await Promise.all([
    getRecentTasks(10),
    getAuditLogs(10),
  ]);

  return NextResponse.json({ tasks, auditLogs });
}
