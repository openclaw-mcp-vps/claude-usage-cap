import axios from "axios";
import { sqlOne } from "@/lib/db";
import { getUsageWindows, type WindowType } from "@/lib/usage-tracker";

function getWindowStart(window: WindowType, now: Date): Date {
  const windows = getUsageWindows(now);

  if (window === "day") {
    return windows.dayStart;
  }

  if (window === "week") {
    return windows.weekStart;
  }

  return windows.monthStart;
}

async function reserveAlertSlot(input: {
  projectId: string;
  windowType: WindowType;
  windowStart: Date;
}): Promise<boolean> {
  const row = await sqlOne<{ id: string }>(
    `
    INSERT INTO alert_events (project_id, window_type, window_start)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, window_type, window_start) DO NOTHING
    RETURNING id
    `,
    [input.projectId, input.windowType, input.windowStart.toISOString()]
  );

  return Boolean(row);
}

export async function sendCapExceededAlert(input: {
  project: {
    id: string;
    name: string;
    slackWebhookUrl: string | null;
  };
  windowType: WindowType;
  totalUsd: number;
  capUsd: number;
}): Promise<{ sent: boolean; reason?: string }> {
  const webhook = input.project.slackWebhookUrl;

  if (!webhook) {
    return { sent: false, reason: "No Slack webhook configured" };
  }

  const now = new Date();
  const windowStart = getWindowStart(input.windowType, now);
  const reserved = await reserveAlertSlot({
    projectId: input.project.id,
    windowType: input.windowType,
    windowStart
  });

  if (!reserved) {
    return { sent: false, reason: "Alert already sent for this cap window" };
  }

  const windowLabel = input.windowType.toUpperCase();

  await axios.post(
    webhook,
    {
      text: `:rotating_light: Claude Usage Cap triggered for *${input.project.name}* (${input.project.id}).\n*${windowLabel}* cap: $${input.capUsd.toFixed(2)}\nCurrent spend: $${input.totalUsd.toFixed(2)}\nFurther proxy requests are blocked with HTTP 429 until the next ${input.windowType} window starts.`
    },
    {
      timeout: 10_000,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return { sent: true };
}
