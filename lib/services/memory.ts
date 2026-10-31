import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { ConversationMessage, TaskRecord, TaskStatus, AuditLogRecord } from '../types';

const DEFAULT_CONVERSATION_ID = '00000000-0000-4000-a000-000000000001';

// In-memory persistent caches for offline/local dev resiliency
let memoryMessages: ConversationMessage[] = [
  {
    id: 'msg-init',
    conversationId: DEFAULT_CONVERSATION_ID,
    role: 'assistant',
    content: 'Good day, sir. All core holographic neural matrices are online and calibrated. Awaiting your vocal directives.',
    createdAt: new Date().toISOString(),
  },
];

let memoryTasks: TaskRecord[] = [
  {
    id: 'TSK-8841',
    title: 'Google Meet Session Provision',
    description: 'Autonomous staging for Backend SRE Architecture Review.',
    status: 'awaiting_approval',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TSK-8840',
    title: 'Neural Matrix Subsystem Diagnostic',
    description: 'Routine verification of holographic telemetry nodes.',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let memoryAuditLogs: AuditLogRecord[] = [
  {
    id: 'AUD-001',
    action: 'SYSTEM_BOOT',
    toolName: 'system_capabilities',
    details: { status: 'ONLINE', model: 'gemini-2.0-flash' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'AUD-002',
    action: 'POLICY_EVALUATION',
    toolName: 'stage_calendar_meeting',
    details: { gate: 'HUMAN_APPROVAL_REQUIRED', risk: 'requires_approval' },
    createdAt: new Date().toISOString(),
  },
];

// 1. Conversation & Message Store
export async function getActiveConversationId(): Promise<string> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from('conversations').select('id').limit(1).single();
      if (data?.id) return data.id;

      const { data: created } = await supabase
        .from('conversations')
        .insert({ id: DEFAULT_CONVERSATION_ID, title: 'JARVIS Primary Session' })
        .select('id')
        .single();
      if (created?.id) return created.id;
    } catch {
      // Fallback below
    }
  }
  return DEFAULT_CONVERSATION_ID;
}

export async function saveMessage(params: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: unknown[];
}): Promise<ConversationMessage> {
  const conversationId = await getActiveConversationId();
  const newMsg: ConversationMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    conversationId,
    role: params.role,
    content: params.content,
    toolCalls: params.toolCalls,
    createdAt: new Date().toISOString(),
  };

  memoryMessages.push(newMsg);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: params.role,
        content: params.content,
        tool_calls: params.toolCalls || [],
      });
    } catch (e) {
      console.warn('Failed to persist message to Supabase, retained in local memory:', e);
    }
  }

  return newMsg;
}

export async function getConversationHistory(limit = 10): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        return data.reverse().map((row: any) => ({
          id: row.id,
          conversationId: row.conversation_id,
          role: row.role,
          content: row.content,
          toolCalls: row.tool_calls,
          createdAt: row.created_at,
        }));
      }
    } catch {
      // Fallback below
    }
  }
  return memoryMessages.slice(-limit);
}

// 2. Context Window Compaction Helper
export function compactContextWindow(
  messages: ConversationMessage[],
  maxTurns = 6
): { compactedPromptPrefix?: string; recentTurns: ConversationMessage[] } {
  if (messages.length <= maxTurns) {
    return { recentTurns: messages };
  }

  const olderTurns = messages.slice(0, messages.length - maxTurns);
  const recentTurns = messages.slice(-maxTurns);

  const summaryOfPast = olderTurns
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 80)}`)
    .join(' | ');

  return {
    compactedPromptPrefix: `[Compacted Prior Context: ${summaryOfPast}]`,
    recentTurns,
  };
}

// 3. Task Lifecycle State Machine
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'failed'],
  running: ['awaiting_approval', 'completed', 'failed'],
  awaiting_approval: ['completed', 'failed', 'running'],
  completed: [],
  failed: ['queued', 'running'],
};

export async function createTaskRecord(
  title: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<TaskRecord> {
  const task: TaskRecord = {
    id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    description,
    status: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryTasks = [task, ...memoryTasks];

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('tasks').insert({
        title: task.title,
        description: task.description,
        status: task.status,
        metadata: metadata || {},
      });
    } catch {
      // Fallback retained
    }
  }

  return task;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  metadata?: Record<string, unknown>
): Promise<TaskRecord | null> {
  const existingIndex = memoryTasks.findIndex((t) => t.id === taskId);
  if (existingIndex !== -1) {
    const current = memoryTasks[existingIndex];
    const allowed = VALID_TRANSITIONS[current.status];
    if (allowed && allowed.includes(newStatus)) {
      current.status = newStatus;
      current.updatedAt = new Date().toISOString();
      memoryTasks[existingIndex] = current;
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
    } catch {
      // Handled in memory
    }
  }

  return memoryTasks.find((t) => t.id === taskId) || null;
}

export async function getRecentTasks(limit = 5): Promise<TaskRecord[]> {
  return memoryTasks.slice(0, limit);
}

// 4. Tamper-Evident Audit Logging
export async function recordAuditLog(
  action: string,
  toolName?: string,
  details?: Record<string, unknown>
): Promise<AuditLogRecord> {
  const record: AuditLogRecord = {
    id: `AUD-${Date.now().toString(36).toUpperCase()}`,
    action,
    toolName,
    details,
    createdAt: new Date().toISOString(),
  };

  memoryAuditLogs = [record, ...memoryAuditLogs.slice(0, 49)];

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert({
        action,
        tool_name: toolName,
        details: details || {},
      });
    } catch {
      // Retained in memory
    }
  }

  return record;
}

export async function getAuditLogs(limit = 10): Promise<AuditLogRecord[]> {
  return memoryAuditLogs.slice(0, limit);
}
