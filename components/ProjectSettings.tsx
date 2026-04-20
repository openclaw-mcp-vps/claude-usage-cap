"use client";

import { useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  proxyKeyPrefix: string;
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
  slackWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type SaveResult = {
  project: Project;
  proxyKey?: string | null;
};

type Props = {
  mode: "create" | "edit";
  project?: Project;
  onSaved?: (result: SaveResult) => void;
};

export function ProjectSettings({ mode, project, onSaved }: Props) {
  const [name, setName] = useState(project?.name ?? "");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [dailyCapUsd, setDailyCapUsd] = useState(project?.dailyCapUsd.toString() ?? "10");
  const [weeklyCapUsd, setWeeklyCapUsd] = useState(project?.weeklyCapUsd.toString() ?? "50");
  const [monthlyCapUsd, setMonthlyCapUsd] = useState(project?.monthlyCapUsd.toString() ?? "150");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(project?.slackWebhookUrl ?? "");
  const [proxyKey, setProxyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submitLabel = mode === "create" ? "Create project" : "Save changes";

  const hasChange = useMemo(() => {
    if (mode === "create") {
      return true;
    }

    if (!project) {
      return false;
    }

    return (
      name !== project.name ||
      dailyCapUsd !== project.dailyCapUsd.toString() ||
      weeklyCapUsd !== project.weeklyCapUsd.toString() ||
      monthlyCapUsd !== project.monthlyCapUsd.toString() ||
      slackWebhookUrl !== (project.slackWebhookUrl ?? "") ||
      anthropicKey.length > 0
    );
  }, [anthropicKey, dailyCapUsd, mode, monthlyCapUsd, name, project, slackWebhookUrl, weeklyCapUsd]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      dailyCapUsd: Number(dailyCapUsd),
      weeklyCapUsd: Number(weeklyCapUsd),
      monthlyCapUsd: Number(monthlyCapUsd),
      slackWebhookUrl: slackWebhookUrl.trim()
    };

    if (mode === "create") {
      payload.anthropicKey = anthropicKey.trim();
    }

    if (mode === "edit") {
      payload.id = project?.id;
      if (anthropicKey.trim()) {
        payload.anthropicKey = anthropicKey.trim();
      }
    }

    try {
      const response = await fetch("/api/projects", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as {
        error?: string;
        project?: Project;
        proxyKey?: string | null;
      };

      if (!response.ok || !result.project) {
        setError(result.error ?? "Could not save project settings");
        return;
      }

      setProxyKey(result.proxyKey ?? null);
      setMessage(mode === "create" ? "Project created." : "Project updated.");
      setAnthropicKey("");
      onSaved?.({ project: result.project, proxyKey: result.proxyKey ?? null });

      if (mode === "create") {
        setName("");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unexpected save error");
    } finally {
      setPending(false);
    }
  }

  async function rotateKey() {
    if (!project?.id) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: project.id, rotateProxyKey: true })
      });

      const result = (await response.json()) as {
        error?: string;
        project?: Project;
        proxyKey?: string | null;
      };

      if (!response.ok || !result.project) {
        setError(result.error ?? "Failed to rotate key");
        return;
      }

      if (result.proxyKey) {
        setProxyKey(result.proxyKey);
      }

      setMessage("Proxy key rotated.");
      onSaved?.({ project: result.project, proxyKey: result.proxyKey ?? null });
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : "Unexpected rotation error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-lg font-semibold">{mode === "create" ? "Create Project" : "Project Settings"}</h3>
      <p className="mt-1 text-sm text-slate-400">
        {mode === "create"
          ? "Register Anthropic credentials, set hard spend caps, and generate a proxy key."
          : "Adjust limits, update secrets, and rotate the proxy key without redeploying your app."}
      </p>

      <form onSubmit={submitForm} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-slate-300 md:col-span-2">
          Project name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-emerald-500"
            placeholder="Production API"
          />
        </label>

        <label className="block text-sm text-slate-300 md:col-span-2">
          Anthropic API key {mode === "edit" ? "(optional for update)" : ""}
          <input
            required={mode === "create"}
            value={anthropicKey}
            onChange={(event) => setAnthropicKey(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs outline-none transition focus:border-emerald-500"
            placeholder="sk-ant-..."
          />
        </label>

        <label className="block text-sm text-slate-300">
          Daily cap (USD)
          <input
            required
            type="number"
            min={1}
            step="0.01"
            value={dailyCapUsd}
            onChange={(event) => setDailyCapUsd(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Weekly cap (USD)
          <input
            required
            type="number"
            min={1}
            step="0.01"
            value={weeklyCapUsd}
            onChange={(event) => setWeeklyCapUsd(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Monthly cap (USD)
          <input
            required
            type="number"
            min={1}
            step="0.01"
            value={monthlyCapUsd}
            onChange={(event) => setMonthlyCapUsd(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Slack webhook (optional)
          <input
            value={slackWebhookUrl}
            onChange={(event) => setSlackWebhookUrl(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-emerald-500"
            placeholder="https://hooks.slack.com/services/..."
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || !hasChange}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : submitLabel}
          </button>

          {mode === "edit" ? (
            <button
              type="button"
              disabled={pending}
              onClick={rotateKey}
              className="rounded-md border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rotate proxy key
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      {proxyKey ? (
        <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-300">Proxy key (shown once)</p>
          <code className="mt-1 block overflow-x-auto whitespace-nowrap text-sm text-emerald-100">{proxyKey}</code>
        </div>
      ) : null}
    </section>
  );
}
