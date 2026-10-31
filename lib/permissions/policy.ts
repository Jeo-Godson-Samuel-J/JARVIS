import { ActionRiskLevel } from '../types';

export interface ActionPolicy {
  toolName: string;
  riskLevel: ActionRiskLevel;
  description: string;
  requiresHumanApproval: boolean;
}

export const TOOL_POLICIES: Record<string, ActionPolicy> = {
  get_current_time: {
    toolName: 'get_current_time',
    riskLevel: 'safe_readonly',
    description: 'Read local and UTC system time',
    requiresHumanApproval: false,
  },
  get_system_capabilities: {
    toolName: 'get_system_capabilities',
    riskLevel: 'safe_readonly',
    description: 'Query operational status of agent subsystems',
    requiresHumanApproval: false,
  },
  list_upcoming_events: {
    toolName: 'list_upcoming_events',
    riskLevel: 'safe_readonly',
    description: 'Retrieve scheduled calendar events and meetings',
    requiresHumanApproval: false,
  },
  stage_calendar_meeting: {
    toolName: 'stage_calendar_meeting',
    riskLevel: 'requires_approval',
    description: 'Provision a new Google Calendar event with Google Meet link',
    requiresHumanApproval: true,
  },
  execute_shell_command: {
    toolName: 'execute_shell_command',
    riskLevel: 'requires_approval',
    description: 'Execute allowlisted local shell command',
    requiresHumanApproval: true,
  },
  modify_filesystem: {
    toolName: 'modify_filesystem',
    riskLevel: 'requires_approval',
    description: 'Write, edit, or delete local file contents',
    requiresHumanApproval: true,
  },
};

export function evaluateToolPolicy(toolName: string): ActionPolicy {
  return (
    TOOL_POLICIES[toolName] || {
      toolName,
      riskLevel: 'requires_approval',
      description: 'Unclassified external tool invocation',
      requiresHumanApproval: true,
    }
  );
}
