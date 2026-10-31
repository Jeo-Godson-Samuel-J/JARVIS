'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Calendar,
  Cpu,
  Activity,
  Layers,
  ChevronRight,
  Maximize2
} from 'lucide-react';

import { CalendarEvent, TaskRecord, AuditLogRecord } from '@/lib/types';

type JarvisState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function JarvisHolographicDashboard() {
  const [state, setState] = useState<JarvisState>('idle');
  const [speechText, setSpeechText] = useState(
    'Good day, sir. All core holographic neural matrices are online and calibrated. Awaiting your vocal directives.'
  );
  const [audioMuted, setAudioMuted] = useState(false);
  const [activeNode, setActiveNode] = useState<'none' | 'neural' | 'calendar' | 'security' | 'diagnostics'>('none');
  const [radialFrequencies, setRadialFrequencies] = useState<number[]>(
    Array.from({ length: 48 }, (_, i) => 10 + (i % 4) * 3)
  );

  // Approval state
  const [pendingApproval, setPendingApproval] = useState<{
    id: string;
    action: string;
    target: string;
    scheduledFor: string;
    risk: string;
    status: 'pending' | 'authorized' | 'rejected';
    parameters?: Record<string, any>;
    meetUrl?: string;
  }>({
    id: 'REQ-8841',
    action: 'Google Meet Session Provision',
    target: 'Backend SRE Architecture Review',
    scheduledFor: 'Tomorrow, 15:00 UTC',
    risk: 'MUTATING_EXTERNAL_SERVICE',
    status: 'pending',
    parameters: {
      title: 'Backend SRE Architecture Review',
      startTime: 'Tomorrow, 15:00 UTC',
      attendees: ['sre-team@company.internal'],
    },
  });

  // Calendar events state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
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
      createdAt: '2026-10-29T10:00:00.000Z',
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
      createdAt: '2026-10-29T10:00:00.000Z',
    },
  ]);

  // Tasks and audit log telemetry state
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  const refreshTelemetry = () => {
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        if (data?.tasks) setTasks(data.tasks);
        if (data?.auditLogs) setAuditLogs(data.auditLogs);
      })
      .catch(() => {});
  };

  // Fetch updated calendar events & tasks on mount
  useEffect(() => {
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((data) => {
        if (data?.events && data.events.length > 0) setCalendarEvents(data.events);
      })
      .catch(() => {});
    refreshTelemetry();
  }, []);

  // Audio equalizer pulse simulation when speaking or listening
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'speaking' || state === 'listening') {
      interval = setInterval(() => {
        setRadialFrequencies(
          Array.from({ length: 48 }, () => Math.floor(Math.random() * 45 + 12))
        );
      }, 90);
    } else {
      setRadialFrequencies(
        Array.from({ length: 48 }, () => Math.floor(Math.random() * 8 + 6))
      );
    }
    return () => clearInterval(interval);
  }, [state]);

  // Speech synthesis helper for realistic JARVIS voice response
  const speakText = (text: string) => {
    setSpeechText(text);
    if (audioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    // Attempt to pick a sophisticated British/English voice if installed
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(
      (v) => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('Daniel')
    );
    if (britishVoice) utterance.voice = britishVoice;

    utterance.onstart = () => setState('speaking');
    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');

    window.speechSynthesis.speak(utterance);
  };

  // Trigger voice command
  const handleToggleVoice = () => {
    if (state === 'listening') {
      setState('idle');
      return;
    }

    setState('listening');
    setSpeechText('Listening for vocal directives...');

    // Check for Web Speech API recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setState('processing');
          setSpeechText(`Analyzing directive: "${transcript}"`);
          await processDirective(transcript);
        };

        recognition.onerror = () => {
          setState('idle');
          speakText('Pardon me, sir. I was unable to capture your audio. Microphone access may be restricted.');
        };

        recognition.onend = () => {
          setState((prev) => (prev === 'listening' ? 'idle' : prev));
        };

        recognition.start();
        return;
      } catch {
        // Fallback below
      }
    }

    // Graceful simulated interaction if microphone API is unavailable
    setTimeout(async () => {
      setState('processing');
      setSpeechText('Analyzing neural telemetry...');
      await processDirective('What is your current system status and time?');
    }, 2400);
  };

  // Approval action handlers
  const handleAuthorizeApproval = async () => {
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          action: 'authorize',
          parameters: pendingApproval.parameters,
        }),
      });
      const data = await res.json();
      if (data.status === 'authorized') {
        setPendingApproval((prev) => ({
          ...prev,
          status: 'authorized',
          meetUrl: data.meetUrl,
        }));
        if (data.event) {
          setCalendarEvents((prev) => [data.event, ...prev]);
        }
        speakText(`Authorization confirmed, sir. Google Meet conference provisioned at ${data.meetUrl}.`);
        refreshTelemetry();
      }
    } catch {
      speakText('Failsafe telemetry error while communicating with approval provisioner.');
    }
  };

  const handleRejectApproval = async () => {
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          action: 'reject',
        }),
      });
      refreshTelemetry();
    } catch {}
    setPendingApproval((prev) => ({ ...prev, status: 'rejected' }));
    speakText('Directive aborted. Standing down.');
  };

  // Send directive to agent backend
  const processDirective = async (prompt: string) => {
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      const reply = data.reply || 'Directive executed, sir.';
      speakText(reply);

      if (data.requiresApproval && data.approvalRequest) {
        setPendingApproval({
          id: data.approvalRequest.id,
          action: data.approvalRequest.summary,
          target: (data.approvalRequest.parameters?.title as string) || 'Google Meet Sync',
          scheduledFor: (data.approvalRequest.parameters?.startTime as string) || 'Upcoming',
          risk: 'MUTATING_EXTERNAL_SERVICE',
          status: 'pending',
          parameters: data.approvalRequest.parameters,
        });
        setActiveNode('security');
      } else if (data.toolUsed === 'stage_calendar_meeting') {
        setActiveNode('security');
      } else if (data.toolUsed === 'get_system_capabilities') {
        setActiveNode('neural');
      } else if (data.toolUsed === 'get_current_time' || data.toolUsed === 'list_upcoming_events') {
        setActiveNode('calendar');
      }
      refreshTelemetry();
    } catch {
      speakText('Telemetry link encountered an anomaly. System operating in local failsafe mode.');
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#02050E] text-sky-100 overflow-hidden font-sans select-none hologram-grid flex flex-col justify-between">
      {/* Vignette Overlay */}
      <div className="absolute inset-0 hologram-vignette pointer-events-none z-10" />

      {/* TOP HUD: STARK TELEMETRY BAR */}
      <header className="relative z-20 px-8 py-5 flex items-center justify-between border-b border-cyan-500/20 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center h-10 w-10">
            <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-25" />
            <div className="h-8 w-8 rounded-full border-2 border-cyan-400 bg-cyan-950/60 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl tracking-[0.25em] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400">
                J.A.R.V.I.S.
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                MARK VII // SRE
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-wider text-cyan-400/60 uppercase">
              Autonomous Holographic Reasoning Engine
            </p>
          </div>
        </div>

        {/* Brain Node Selector Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveNode(activeNode === 'neural' ? 'none' : 'neural')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all border ${
              activeNode === 'neural'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900/40 border-cyan-500/20 text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>NEURAL_NODE</span>
          </button>

          <button
            onClick={() => setActiveNode(activeNode === 'calendar' ? 'none' : 'calendar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all border ${
              activeNode === 'calendar'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900/40 border-cyan-500/20 text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            <span>CHRONO_MATRIX</span>
          </button>

          <button
            onClick={() => setActiveNode(activeNode === 'security' ? 'none' : 'security')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all border ${
              activeNode === 'security'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/40 border-cyan-500/20 text-slate-400 hover:text-amber-300'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>SECURITY_GATE</span>
          </button>
        </div>

        {/* Audio Mute & Telemetry */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className="p-2 rounded-lg bg-slate-900/50 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 transition-all"
            title={audioMuted ? 'Unmute Audio Voice' : 'Mute Voice'}
          >
            {audioMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <div className="font-mono text-[11px] text-cyan-400/80 px-3 py-1 rounded bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                state === 'idle'
                  ? 'bg-cyan-400'
                  : state === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : state === 'processing'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-blue-400 animate-pulse'
              }`}
            />
            <span className="uppercase tracking-widest">{state}</span>
          </div>
        </div>
      </header>

      {/* CENTER STAGE: THE IRON MAN HOLOGRAPHIC ARC REACTOR */}
      <main className="relative flex-1 flex items-center justify-center z-20">
        
        {/* Floating Background Calibration Ring (Outer Perimeter) */}
        <div className="absolute w-[560px] h-[560px] rounded-full border border-cyan-500/10 animate-spin-cw-slow pointer-events-none" />
        <div className="absolute w-[490px] h-[490px] rounded-full border border-dashed border-cyan-400/20 animate-spin-ccw-slow pointer-events-none" />

        {/* Shockwave Rings Expanding when Speaking */}
        {state === 'speaking' && (
          <>
            <div className="absolute w-[280px] h-[280px] rounded-full border border-cyan-400/40 animate-shockwave pointer-events-none" />
            <div
              className="absolute w-[280px] h-[280px] rounded-full border border-blue-400/40 animate-shockwave pointer-events-none"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        {/* Radial Audio Spectrum Spokes (Rotating Soundwave) */}
        <div className="absolute w-[430px] h-[430px] flex items-center justify-center pointer-events-none">
          {radialFrequencies.map((freq, i) => {
            const angle = (i / radialFrequencies.length) * 360;
            return (
              <div
                key={i}
                className="absolute origin-bottom transition-all duration-100"
                style={{
                  transform: `rotate(${angle}deg) translateY(-145px)`,
                  height: `${freq}px`,
                  width: '2px',
                  backgroundColor:
                    state === 'listening'
                      ? 'rgba(0, 255, 180, 0.7)'
                      : state === 'speaking'
                      ? 'rgba(0, 240, 255, 0.9)'
                      : 'rgba(0, 200, 255, 0.25)',
                  boxShadow:
                    state === 'speaking'
                      ? '0 0 8px rgba(0, 240, 255, 0.8)'
                      : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Intermediate Mechanical Gear Ring (Counter-Clockwise) */}
        <svg
          className="absolute w-[360px] h-[360px] animate-spin-ccw-slow pointer-events-none"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="rgba(0, 240, 255, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(0, 160, 255, 0.3)"
            strokeWidth="1"
            strokeDasharray="30 15 10 15"
          />
        </svg>

        {/* Outer Geometric Reticle with Degree Markings */}
        <svg
          className="absolute w-[320px] h-[320px] animate-spin-cw-fast pointer-events-none"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="rgba(0, 240, 255, 0.4)"
            strokeWidth="1"
            strokeDasharray="8 6"
          />
          <line x1="100" y1="20" x2="100" y2="30" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="1.5" />
          <line x1="100" y1="170" x2="100" y2="180" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="1.5" />
          <line x1="20" y1="100" x2="30" y2="100" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="1.5" />
          <line x1="170" y1="100" x2="180" y2="100" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="1.5" />
        </svg>

        {/* CENTRAL ARC REACTOR BUTTON (Interactive Voice Trigger) */}
        <button
          onClick={handleToggleVoice}
          className={`relative z-30 group cursor-pointer flex items-center justify-center h-48 w-48 rounded-full transition-all duration-500 ${
            state === 'listening'
              ? 'animate-arc-active arc-glow-intense scale-110'
              : state === 'speaking'
              ? 'animate-arc-active arc-glow-intense'
              : 'animate-arc-idle arc-glow hover:scale-105'
          }`}
        >
          {/* Outer Glass Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-300/60 bg-gradient-to-br from-cyan-500/20 via-blue-900/30 to-slate-950 backdrop-blur-md shadow-2xl" />

          {/* Concentric Inner Ring */}
          <div className="absolute inset-4 rounded-full border border-cyan-400/50 bg-gradient-to-tr from-cyan-950 via-slate-950 to-blue-950 flex items-center justify-center">
            {/* Plasma Sphere Core */}
            <div
              className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                state === 'listening'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-[0_0_50px_rgba(0,255,180,0.9)]'
                  : state === 'speaking'
                  ? 'bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-500 shadow-[0_0_60px_rgba(0,240,255,1)]'
                  : 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_40px_rgba(0,200,255,0.7)]'
              }`}
            >
              {/* Inner Core Eye Icon */}
              <div className="h-14 w-14 rounded-full bg-slate-950/80 border border-cyan-200/50 flex flex-col items-center justify-center text-cyan-200 group-hover:scale-110 transition-transform">
                {state === 'listening' ? (
                  <MicOff className="h-6 w-6 text-emerald-300 animate-pulse" />
                ) : (
                  <Mic className="h-6 w-6 text-cyan-300" />
                )}
                <span className="text-[8px] font-mono tracking-widest uppercase mt-0.5 text-cyan-300/80">
                  {state === 'listening' ? 'STOP' : 'VOICE'}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* FLOATING HOLOGRAPHIC BRAIN NODES (Context Windows) */}

        {/* 1. NEURAL NODE */}
        {activeNode === 'neural' && (
          <div className="absolute left-8 lg:left-14 top-1/2 -translate-y-1/2 w-80 stark-panel-glow rounded-2xl p-5 z-40 transition-all duration-300 border-cyan-400/50">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                  Neural Core // Gemini 2.0
                </span>
              </div>
              <button
                onClick={() => setActiveNode('none')}
                className="text-slate-400 hover:text-cyan-300"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-[11px] text-cyan-100/90 max-h-[75vh] overflow-y-auto">
              <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                <div className="text-slate-400 text-[10px]">PERSISTENT_MEMORY_STORE:</div>
                <div className="text-cyan-300 font-semibold flex items-center justify-between">
                  <span>Supabase / Local Dual-Mode</span>
                  <span className="text-[9px] text-emerald-400">ACTIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded bg-slate-950/60 border border-cyan-500/10">
                  <div className="text-slate-400">LATENCY</div>
                  <div className="text-emerald-400 font-bold">14ms</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-cyan-500/10">
                  <div className="text-slate-400">CONTEXT_BUFFER</div>
                  <div className="text-cyan-400 font-bold">Compacted</div>
                </div>
              </div>

              {/* Task State Machine Queue */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Task State Machine:</div>
                {tasks.length > 0 ? (
                  tasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="p-2 rounded bg-slate-950/70 border border-cyan-500/20">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-cyan-300 font-bold">{t.id}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded uppercase font-semibold ${
                            t.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : t.status === 'awaiting_approval'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-slate-200 text-[10px] truncate mt-0.5">{t.title}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-[10px]">No active tasks</div>
                )}
              </div>

              {/* Tamper-Evident Audit Logs */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tamper-Evident Audit Trail:</div>
                <div className="space-y-1 bg-slate-950/50 p-2 rounded border border-cyan-500/10">
                  {auditLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="text-[9px] flex items-center justify-between text-slate-400">
                      <span className="text-cyan-300 font-semibold">{log.action}</span>
                      <span className="text-slate-500">{log.toolName || 'sys'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CHRONO / CALENDAR MATRIX */}
        {activeNode === 'calendar' && (
          <div className="absolute right-8 lg:right-14 top-1/2 -translate-y-1/2 w-88 max-h-[80vh] overflow-y-auto stark-panel-glow rounded-2xl p-5 z-40 transition-all duration-300 border-sky-400/50">
            <div className="flex items-center justify-between border-b border-sky-500/30 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-400" />
                <span className="font-mono text-xs font-bold tracking-widest text-sky-300 uppercase">
                  Temporal Agenda // Meet Matrix
                </span>
              </div>
              <button
                onClick={() => setActiveNode('none')}
                className="text-slate-400 hover:text-sky-300"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {calendarEvents.map((evt) => (
                <div key={evt.id} className="p-3 rounded-xl bg-slate-950/70 border border-sky-500/30 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sky-400 tracking-wider uppercase font-semibold">SESSION // {evt.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300">
                      CONFIRMED
                    </span>
                  </div>
                  <div className="text-slate-100 font-semibold mt-1">{evt.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{evt.startTime}</div>

                  {evt.meetUrl && (
                    <a
                      href={evt.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 flex items-center justify-center gap-2 w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-mono text-[11px] transition-all"
                    >
                      <Activity className="h-3 w-3 text-cyan-300" /> Connect to Google Meet
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SECURITY & HUMAN APPROVAL GATE */}
        {activeNode === 'security' && (
          <div className="absolute top-1/2 -translate-y-1/2 w-96 stark-panel-glow rounded-2xl p-5 z-40 border-amber-500/50">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="font-mono text-xs font-bold tracking-widest text-amber-300 uppercase">
                  Human-in-the-Loop // Approval Gate
                </span>
              </div>
              <button
                onClick={() => setActiveNode('none')}
                className="text-slate-400 hover:text-amber-300"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="font-mono text-xs space-y-2.5">
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider">
                  ACTION_STAGED: {pendingApproval.id}
                </div>
                <div className="text-slate-100 font-semibold mt-1">{pendingApproval.action}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Target: {pendingApproval.target}</div>
                <div className="text-[10px] text-cyan-300 mt-1">Time: {pendingApproval.scheduledFor}</div>
              </div>

              {pendingApproval.status === 'pending' ? (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAuthorizeApproval}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> AUTHORIZE
                  </button>
                  <button
                    onClick={handleRejectApproval}
                    className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" /> REJECT
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`text-center py-2 rounded font-mono text-xs uppercase ${
                      pendingApproval.status === 'authorized'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    Status: {pendingApproval.status}
                  </div>
                  {pendingApproval.status === 'authorized' && pendingApproval.meetUrl && (
                    <a
                      href={pendingApproval.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs transition-all"
                    >
                      <Activity className="h-3.5 w-3.5" /> Launch Google Meet Session
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM HUD: HOLOGRAPHIC SPOKEN SUBTITLE & VOICE PROMPTS */}
      <footer className="relative z-20 px-8 py-5 border-t border-cyan-500/20 bg-slate-950/60 backdrop-blur-md flex flex-col items-center gap-3">
        {/* Holographic Voice Subtitle Terminal */}
        <div className="max-w-3xl w-full text-center px-6 py-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400/70">
              JARVIS Audio Output // Subtitle Stream
            </span>
          </div>
          <p className="text-sm md:text-base font-mono text-cyan-100 font-medium leading-relaxed tracking-wide">
            &ldquo;{speechText}&rdquo;
          </p>
        </div>

        {/* Quick Voice Directive Shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
          <button
            onClick={() => {
              setState('processing');
              setSpeechText('Querying local and UTC chronometers...');
              processDirective('What time is it right now?');
            }}
            className="px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            <span>&ldquo;What time is it?&rdquo;</span>
          </button>

          <button
            onClick={() => {
              setState('processing');
              setSpeechText('Scanning scheduled calendar sessions and Google Meet links...');
              processDirective('What is on my upcoming calendar?');
            }}
            className="px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 transition-all flex items-center gap-1.5"
          >
            <Calendar className="h-3 w-3 text-sky-300" />
            <span>&ldquo;Show calendar agenda&rdquo;</span>
          </button>

          <button
            onClick={() => {
              setState('processing');
              setSpeechText('Staging architecture sync with Google Meet provisioner...');
              processDirective('Schedule a 30-minute Architecture Sync with Alex tomorrow at 3 PM');
            }}
            className="px-3 py-1.5 rounded-full bg-sky-950/50 hover:bg-sky-900/60 border border-sky-400/40 text-sky-200 transition-all flex items-center gap-1.5"
          >
            <Activity className="h-3 w-3 text-emerald-400" />
            <span>&ldquo;Schedule SRE Sync with Alex&rdquo;</span>
          </button>

          <button
            onClick={() => {
              setState('processing');
              setSpeechText('Scanning active neural modules and subsystems...');
              processDirective('What are your active capabilities?');
            }}
            className="px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 transition-all flex items-center gap-1.5"
          >
            <Cpu className="h-3 w-3" />
            <span>&ldquo;Report capabilities&rdquo;</span>
          </button>

          <button
            onClick={() => {
              setActiveNode('security');
              speakText('Opening security approval gate for your review, sir.');
            }}
            className="px-3 py-1.5 rounded-full bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5"
          >
            <ShieldAlert className="h-3 w-3" />
            <span>&ldquo;Open approval queue&rdquo;</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
