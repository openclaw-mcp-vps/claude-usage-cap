"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LimitSettingsProps = {
  projectId: string;
  initial: {
    dailyUsd: number;
    weeklyUsd: number;
    monthlyUsd: number;
    slackWebhookUrl: string | null;
  };
};

export function LimitSettings({ projectId, initial }: LimitSettingsProps) {
  const [dailyUsd, setDailyUsd] = useState(String(initial.dailyUsd));
  const [weeklyUsd, setWeeklyUsd] = useState(String(initial.weeklyUsd));
  const [monthlyUsd, setMonthlyUsd] = useState(String(initial.monthlyUsd));
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(initial.slackWebhookUrl ?? "");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/projects", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        id: projectId,
        caps: {
          dailyUsd: Number(dailyUsd),
          weeklyUsd: Number(weeklyUsd),
          monthlyUsd: Number(monthlyUsd)
        },
        slackWebhookUrl: slackWebhookUrl || null,
        anthropicApiKey: anthropicApiKey || undefined
      })
    });

    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(json.error || "Failed to save settings.");
      setSaving(false);
      return;
    }

    setAnthropicApiKey("");
    setMessage("Settings updated.");
    setSaving(false);
  }

  return (
    <form className="space-y-4 rounded-xl border border-[#30363d] bg-[#111821]/70 p-5" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">Limit settings</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dailyUsd">Daily cap (USD)</Label>
          <Input
            id="dailyUsd"
            inputMode="decimal"
            value={dailyUsd}
            onChange={(event) => setDailyUsd(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weeklyUsd">Weekly cap (USD)</Label>
          <Input
            id="weeklyUsd"
            inputMode="decimal"
            value={weeklyUsd}
            onChange={(event) => setWeeklyUsd(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyUsd">Monthly cap (USD)</Label>
          <Input
            id="monthlyUsd"
            inputMode="decimal"
            value={monthlyUsd}
            onChange={(event) => setMonthlyUsd(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slackWebhook">Slack webhook URL (optional)</Label>
        <Input
          id="slackWebhook"
          value={slackWebhookUrl}
          placeholder="https://hooks.slack.com/services/..."
          onChange={(event) => setSlackWebhookUrl(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="anthropicApiKey">Replace Anthropic API key (optional)</Label>
        <Input
          id="anthropicApiKey"
          type="password"
          value={anthropicApiKey}
          placeholder="sk-ant-..."
          onChange={(event) => setAnthropicApiKey(event.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        {message ? <p className="text-sm text-[#9da7b3]">{message}</p> : null}
      </div>
    </form>
  );
}
