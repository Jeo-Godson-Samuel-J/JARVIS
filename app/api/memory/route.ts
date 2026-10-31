import { NextResponse } from 'next/server';
import { getConversationHistory } from '@/lib/services/memory';

export async function GET() {
  const messages = await getConversationHistory(25);
  return NextResponse.json({ messages });
}
