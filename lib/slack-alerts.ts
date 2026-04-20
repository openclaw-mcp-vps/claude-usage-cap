import { WebClient } from "@slack/web-api";
import { markAlertSent, wasAlertSent } from "@/lib/usage-tracker";

type AlertInput = {
  projectId: string;
  projectName: string;
  periodType: "day" | "week" | "month";
  periodKey: string;
  currentSpendUsd: number;
  capUsd: number;
  slackWebhookUrl: string | null;
};

async function postWebhookAlert(webhookUrl: string, text: string) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
}

async function postBotAlert(text: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ALERT_CHANNEL;
  if (!token || !channel) {
    return;
  }

  const client = new WebClient(token);
  await client.chat.postMessage({
    channel,
    text
  });
}

export async function sendCapAlertIfNeeded(input: AlertInput) {
  if (wasAlertSent(input.projectId, input.periodType, input.periodKey)) {
    return;
  }

  const text = [
    `Claude Usage Cap: limit reached for project "${input.projectName}"`,
    `Period: ${input.periodType} (${input.periodKey})`,
    `Spend: $${input.currentSpendUsd.toFixed(2)} / $${input.capUsd.toFixed(2)}`,
    "Proxy is returning 429 until the period resets."
  ].join("\n");

  try {
    if (input.slackWebhookUrl) {
      await postWebhookAlert(input.slackWebhookUrl, text);
    } else {
      await postBotAlert(text);
    }
    markAlertSent(input.projectId, input.periodType, input.periodKey);
  } catch (error) {
    console.error("Failed to send Slack alert", error);
  }
}
