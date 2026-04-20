"use client";

import { useState } from "react";
import { AlertTriangle, KeyRound, Save, ShieldCheck } from "lucide-react";

type ProjectSettingsModel = {
  id: string;
  name: string;
  slackWebhookUrl: string | null;
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
  proxyKeyLast4: string;
};

export function ProjectSettings({ project }: { project: ProjectSettingsModel }) {
  const [name, setName] = useState(project.name);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(project.slackWebhookUrl ?? "");
  const [dailyCapUsd, setDailyCapUsd] = useState(String(project.dailyCapUsd));
  const [weeklyCapUsd, setWeeklyCapUsd] = useState(String(project.weeklyCapUsd));
  const [monthlyCapUsd, setMonthlyCapUsd] = useState(String(project.monthlyCapUsd));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newProxyKey, setNewProxyKey] = useState<string | null>(null);

  async function updateSettings() {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: project.id,
          name,
          anthropicApiKey: anthropicApiKey || undefined,
          slackWebhookUrl,
          caps: {
            dailyCapUsd: Number(dailyCapUsd),
            weeklyCapUsd: Number(weeklyCapUsd),
            monthlyCapUsd: Number(monthlyCapUsd)
          }
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update project settings");
      }

      setAnthropicApiKey("");
      setMessage("Project settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update project settings");
    } finally {
      setSubmitting(false);
    }
  }

  async function rotateProxyKey() {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: project.id,
          rotateProxyKey: true
        })
      });

      const data = (await response.json()) as { proxyKey?: string; error?: string };

      if (!response.ok || !data.proxyKey) {
        throw new Error(data.error ?? "Failed to rotate proxy key");
      }

      setNewProxyKey(data.proxyKey);
      setMessage("Proxy key rotated. Update your workloads immediately.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to rotate proxy key");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
        <ShieldCheck size={16} />
        Project Settings
      </div>

      <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
        Project Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
        Anthropic API Key
        <input
          value={anthropicApiKey}
          onChange={(event) => setAnthropicApiKey(event.target.value)}
          placeholder="Paste a new key only when rotating credentials"
          className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
        Slack Alert Webhook URL
        <input
          value={slackWebhookUrl}
          onChange={(event) => setSlackWebhookUrl(event.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Daily Cap (USD)
          <input
            type="number"
            min={0.5}
            step="0.5"
            value={dailyCapUsd}
            onChange={(event) => setDailyCapUsd(event.target.value)}
            className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Weekly Cap (USD)
          <input
            type="number"
            min={0.5}
            step="0.5"
            value={weeklyCapUsd}
            onChange={(event) => setWeeklyCapUsd(event.target.value)}
            className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Monthly Cap (USD)
          <input
            type="number"
            min={0.5}
            step="0.5"
            value={monthlyCapUsd}
            onChange={(event) => setMonthlyCapUsd(event.target.value)}
            className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
        </label>
      </div>

      <div className="rounded-lg border border-[#334155] bg-[#0f172a] px-4 py-3 text-sm text-[#cbd5e1]">
        Active proxy key ends with <span className="font-mono">{project.proxyKeyLast4}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={updateSettings}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#04120a] transition hover:bg-[#16a34a] disabled:opacity-50"
        >
          <Save size={16} />
          Save Settings
        </button>

        <button
          onClick={rotateProxyKey}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg border border-[#f59e0b] bg-[#2a1f09] px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#3a2d10] disabled:opacity-50"
        >
          <KeyRound size={16} />
          Rotate Proxy Key
        </button>
      </div>

      {newProxyKey ? (
        <div className="rounded-lg border border-[#14532d] bg-[#052e16] px-4 py-3 text-sm text-[#bbf7d0]">
          New proxy key (shown once): <span className="font-mono">{newProxyKey}</span>
        </div>
      ) : null}

      {message ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#cbd5e1]">
          <AlertTriangle size={15} />
          {message}
        </div>
      ) : null}
    </div>
  );
}
