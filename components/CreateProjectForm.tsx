"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";

export function CreateProjectForm() {
  const [name, setName] = useState("Primary API Workload");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [dailyCapUsd, setDailyCapUsd] = useState("10");
  const [weeklyCapUsd, setWeeklyCapUsd] = useState("40");
  const [monthlyCapUsd, setMonthlyCapUsd] = useState("120");
  const [loading, setLoading] = useState(false);
  const [proxyKey, setProxyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createProject() {
    setLoading(true);
    setMessage(null);
    setProxyKey(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          anthropicApiKey,
          slackWebhookUrl,
          caps: {
            dailyCapUsd: Number(dailyCapUsd),
            weeklyCapUsd: Number(weeklyCapUsd),
            monthlyCapUsd: Number(monthlyCapUsd)
          }
        })
      });

      const data = (await response.json()) as {
        proxyKey?: string;
        error?: string | Record<string, unknown>;
      };

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : "Project creation failed. Check the form values.";

        throw new Error(errorMessage);
      }

      setProxyKey(data.proxyKey ?? null);
      setAnthropicApiKey("");
      setMessage("Project created. Save your proxy key now.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Project creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
        <PlusCircle size={16} />
        New Protected Project
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Project Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Slack Webhook (Optional)
          <input
            value={slackWebhookUrl}
            onChange={(event) => setSlackWebhookUrl(event.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
        Anthropic API Key
        <input
          value={anthropicApiKey}
          onChange={(event) => setAnthropicApiKey(event.target.value)}
          placeholder="sk-ant-..."
          className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#e6edf3] outline-none transition focus:border-[#22c55e]"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-[#cbd5e1]">
          Daily Cap
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
          Weekly Cap
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
          Monthly Cap
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

      <button
        onClick={createProject}
        disabled={loading || anthropicApiKey.length < 20}
        className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#04120a] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Project + Generate Proxy Key"}
      </button>

      {proxyKey ? (
        <div className="rounded-lg border border-[#14532d] bg-[#052e16] px-4 py-3 text-sm text-[#bbf7d0]">
          Proxy key (shown once): <span className="font-mono">{proxyKey}</span>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#cbd5e1]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
