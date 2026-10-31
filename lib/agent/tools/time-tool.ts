export const timeToolDefinition = {
  name: 'get_current_time',
  description: 'Retrieve the current local and ISO time, timezone, and day of week.',
  parameters: {
    type: 'OBJECT',
    properties: {},
  },
};

export async function executeTimeTool() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
