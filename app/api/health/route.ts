import { NextResponse } from 'next/server';

export async function GET() {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return NextResponse.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      gemini: geminiConfigured ? 'configured' : 'missing_api_key',
      supabase: supabaseConfigured ? 'configured' : 'missing_keys',
      voiceEngine: 'ready',
      desktopCompanion: 'standby',
    },
    version: '0.1.0',
  });
}
