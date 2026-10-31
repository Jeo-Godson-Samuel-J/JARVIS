import { GoogleGenAI } from '@google/genai';
import { JARVIS_SYSTEM_PROMPT } from './prompts';
import { timeToolDefinition, executeTimeTool } from './tools/time-tool';
import { systemCapabilitiesToolDefinition, executeSystemCapabilitiesTool } from './tools/system-tool';
import {
  listUpcomingEventsToolDefinition,
  executeListUpcomingEvents,
  stageCalendarMeetingToolDefinition,
  stageCalendarMeeting,
} from './tools/calendar-tool';
import { ApprovalRequest } from '../types';
import {
  saveMessage,
  getConversationHistory,
  compactContextWindow,
  createTaskRecord,
  recordAuditLog,
} from '../services/memory';

export interface AgentExecutionResult {
  reply: string;
  toolUsed?: string;
  toolResult?: unknown;
  requiresApproval?: boolean;
  approvalRequest?: ApprovalRequest;
}

export async function runJarvisAgent(userMessage: string): Promise<AgentExecutionResult> {
  // 1. Record incoming message & audit log
  await saveMessage({ role: 'user', content: userMessage });
  await recordAuditLog('DIRECTIVE_RECEIVED', undefined, { prompt: userMessage });

  const apiKey = process.env.GEMINI_API_KEY;

  // 2. Fallback simulation when no live API key is set yet
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const lower = userMessage.toLowerCase();
    let result: AgentExecutionResult;

    // Time / Date queries
    if (lower.includes('time') || lower.includes('date') || lower.includes('day')) {
      const timeData = await executeTimeTool();
      await recordAuditLog('TOOL_INVOKED', 'get_current_time', { result: timeData });
      result = {
        reply: `Current time is **${timeData.localTime}** on ${timeData.date} (${timeData.timezone}).`,
        toolUsed: 'get_current_time',
        toolResult: timeData,
      };
    }
    // Subsystem capabilities
    else if (lower.includes('status') || lower.includes('capabilities') || lower.includes('subsystem')) {
      const capData = await executeSystemCapabilitiesTool();
      await recordAuditLog('TOOL_INVOKED', 'get_system_capabilities', { result: capData });
      result = {
        reply: `All holographic subsystems operational. Active model: **${capData.model}**. Security policy gate is enforced.`,
        toolUsed: 'get_system_capabilities',
        toolResult: capData,
      };
    }
    // Meeting scheduling / Google Meet staging
    else if (
      lower.includes('schedule') ||
      lower.includes('meet') ||
      lower.includes('sync') ||
      lower.includes('book') ||
      lower.includes('calendar event')
    ) {
      let title = 'SRE Production Incident Review';
      if (lower.includes('alex')) title = 'Architecture Sync with Alex';
      else if (lower.includes('triage')) title = 'Emergency Incident Triage';
      else if (lower.includes('pipeline')) title = 'Deployment Pipeline Sync';

      const staged = stageCalendarMeeting({
        title,
        startTime: 'Tomorrow, 15:00 UTC',
        endTime: 'Tomorrow, 15:30 UTC',
        attendees: ['alex.dev@company.internal', 'sre-lead@company.internal'],
        description: 'Scheduled via JARVIS vocal directive. Includes Google Meet conference link.',
      });

      // Create Task and Audit trail
      await createTaskRecord(`Provision Google Meet: ${title}`, 'Awaiting human authorization on HUD', {
        approvalId: staged.approvalRequest.id,
      });
      await recordAuditLog('ACTION_STAGED', 'stage_calendar_meeting', {
        approvalId: staged.approvalRequest.id,
        target: title,
      });

      result = {
        reply: `I have staged the Google Meet session for "${title}" tomorrow at 15:00 UTC. Security protocol requires your authorization on the HUD before provisioning.`,
        toolUsed: 'stage_calendar_meeting',
        toolResult: staged.approvalRequest,
        requiresApproval: true,
        approvalRequest: staged.approvalRequest,
      };
    }
    // Query upcoming calendar agenda
    else if (lower.includes('calendar') || lower.includes('agenda') || lower.includes('upcoming')) {
      const events = await executeListUpcomingEvents(3);
      await recordAuditLog('TOOL_INVOKED', 'list_upcoming_events', { count: events.length });
      const summary = events
        .map((e) => `• **${e.title}** (${e.startTime}) [Meet: ${e.meetUrl}]`)
        .join('\n');
      result = {
        reply: `Here are your upcoming scheduled sessions, sir:\n${summary}`,
        toolUsed: 'list_upcoming_events',
        toolResult: events,
      };
    }
    // General conversational turn
    else {
      result = {
        reply: `JARVIS online. Received instruction: "${userMessage}". (Connect your GEMINI_API_KEY in .env.local for full autonomous reasoning).`,
      };
    }

    // Persist assistant message turn
    await saveMessage({
      role: 'assistant',
      content: result.reply,
      toolCalls: result.toolUsed ? [{ name: result.toolUsed }] : undefined,
    });

    return result;
  }

  // 3. Live Gemini 2.0 reasoning loop with multi-turn memory
  const ai = new GoogleGenAI({ apiKey });

  // Retrieve prior turns for conversation continuity
  const rawHistory = await getConversationHistory(8);
  const { compactedPromptPrefix } = compactContextWindow(rawHistory, 6);

  const tools = [
    {
      functionDeclarations: [
        timeToolDefinition,
        systemCapabilitiesToolDefinition,
        listUpcomingEventsToolDefinition,
        stageCalendarMeetingToolDefinition,
      ],
    },
  ];

  const effectiveSystemPrompt = compactedPromptPrefix
    ? `${JARVIS_SYSTEM_PROMPT}\n\n${compactedPromptPrefix}`
    : JARVIS_SYSTEM_PROMPT;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userMessage,
    config: {
      systemInstruction: effectiveSystemPrompt,
      tools: tools as any,
    },
  });

  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    let toolResult: unknown;
    let requiresApproval = false;
    let approvalRequest: ApprovalRequest | undefined;

    await recordAuditLog('TOOL_INVOKED', call.name, { args: call.args });

    if (call.name === 'get_current_time') {
      toolResult = await executeTimeTool();
    } else if (call.name === 'get_system_capabilities') {
      toolResult = await executeSystemCapabilitiesTool();
    } else if (call.name === 'list_upcoming_events') {
      const limit = (call.args as any)?.limit || 5;
      toolResult = await executeListUpcomingEvents(limit);
    } else if (call.name === 'stage_calendar_meeting') {
      const staged = stageCalendarMeeting(call.args as any);
      toolResult = staged.approvalRequest;
      requiresApproval = true;
      approvalRequest = staged.approvalRequest;

      await createTaskRecord(
        `Provision Google Meet: ${(call.args as any)?.title || 'Meeting'}`,
        'Awaiting human authorization on HUD',
        { approvalId: staged.approvalRequest.id }
      );
      await recordAuditLog('ACTION_STAGED', 'stage_calendar_meeting', {
        approvalId: staged.approvalRequest.id,
      });
    }

    const secondTurn = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ functionCall: call }] },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: {
                  result: toolResult,
                  requiresApproval,
                  approvalNote: requiresApproval
                    ? 'This action has been placed in the Human-in-the-Loop approval queue. Instruct the user to authorize it on their dashboard.'
                    : undefined,
                },
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: effectiveSystemPrompt,
      },
    });

    const reply = secondTurn.text || 'Action staged successfully, awaiting your review.';
    await saveMessage({
      role: 'assistant',
      content: reply,
      toolCalls: functionCalls,
    });

    return {
      reply,
      toolUsed: call.name,
      toolResult,
      requiresApproval,
      approvalRequest,
    };
  }

  const reply = response.text || 'Instruction processed, sir.';
  await saveMessage({ role: 'assistant', content: reply });

  return { reply };
}
