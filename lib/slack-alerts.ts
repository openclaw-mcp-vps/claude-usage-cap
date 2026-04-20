import { WebClient } from "@slack/web-api";

import type { CapPeriod } from "@/lib/usage-tracker";

export async function sendSpendLimitAlert(input: {
  projectName: string;
  slackBotToken: string | null;
  slackChannel: string | null;
  period: CapPeriod;
  cap: number;
  spent: number;
}) {
  if (!input.slackBotToken || !input.slackChannel) {
    return false;
  }

  const client = new WebClient(input.slackBotToken);

  await client.chat.postMessage({
    channel: input.slackChannel,
    text: `Claude Usage Cap blocked project \"${input.projectName}\"`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `:rotating_light: *Usage cap reached*\n` +
            `Project: *${input.projectName}*\n` +
            `Window: *${input.period}*\n` +
            `Spent: *$${input.spent.toFixed(2)}*\n` +
            `Cap: *$${input.cap.toFixed(2)}*\n` +
            `New requests are now returning HTTP 429 until the next window.`
        }
      }
    ]
  });

  return true;
}
