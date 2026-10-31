import { NextRequest, NextResponse } from 'next/server';
import { runJarvisAgent } from '@/lib/agent/runtime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await runJarvisAgent(message);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Agent chat error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal agent error' },
      { status: 500 }
    );
  }
}
