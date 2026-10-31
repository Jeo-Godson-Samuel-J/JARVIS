import { z } from 'zod';

export type TaskStatus = 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed';
export type ActionRiskLevel = 'safe_readonly' | 'requires_approval' | 'blocked';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  toolName: string;
  summary: string;
  parameters: Record<string, unknown>;
  diffPreview?: string;
  riskLevel: ActionRiskLevel;
  status: ApprovalStatus;
  createdAt: string;
}

export interface SystemStatus {
  gemini: 'connected' | 'error' | 'idle';
  voice: 'active' | 'listening' | 'muted' | 'disconnected';
  calendar: 'synced' | 'not_configured';
  desktopCompanion: 'online' | 'offline';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  meetUrl: string;
  conferenceId: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: unknown[];
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  toolName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
