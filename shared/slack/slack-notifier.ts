export interface SlackAlertPayload {
  title: string;
  message: string;
  fields?: Array<{ title: string; value: string }>;
  actions?: Array<{ text: string; url: string }>;
}

export async function sendSlackAlert(payload: SlackAlertPayload): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${payload.title}*\n${payload.message}`,
      },
    },
  ];

  if (payload.fields?.length) {
    blocks.push({
      type: 'section',
      fields: payload.fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.title}*\n${f.value}`,
      })),
    });
  }

  if (payload.actions?.length) {
    blocks.push({
      type: 'actions',
      elements: payload.actions.map((a) => ({
        type: 'button',
        text: { type: 'plain_text', text: a.text },
        url: a.url,
      })),
    });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `:rotating_light: ${payload.title}`, blocks }),
    });
    if (!res.ok) {
      console.warn(`Slack alert failed: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.warn(`Slack alert error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
