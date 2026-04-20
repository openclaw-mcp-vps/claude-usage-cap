"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proxyKey, setProxyKey] = useState("");
  const [form, setForm] = useState({
    name: "",
    anthropicApiKey: "",
    dailyCap: "20",
    weeklyCap: "80",
    monthlyCap: "300",
    slackBotToken: "",
    slackChannel: ""
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProxyKey("");
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          dailyCap: Number(form.dailyCap),
          weeklyCap: Number(form.weeklyCap),
          monthlyCap: Number(form.monthlyCap)
        })
      });

      const body = (await response.json()) as { error?: string; proxyKey?: string };

      if (!response.ok) {
        setError(body.error || "Could not create project.");
        return;
      }

      if (body.proxyKey) {
        setProxyKey(body.proxyKey);
      }

      setForm((current) => ({
        ...current,
        name: "",
        anthropicApiKey: ""
      }));
      router.refresh();
    } catch {
      setError("Network error while creating project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">Create project guardrail</CardTitle>
        <CardDescription>Register an Anthropic key, define caps, and receive one proxy key for your app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Internal Search Agent"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anthropic-api-key">Anthropic API key</Label>
            <Input
              id="anthropic-api-key"
              type="password"
              value={form.anthropicApiKey}
              onChange={(event) => setForm((current) => ({ ...current, anthropicApiKey: event.target.value }))}
              placeholder="sk-ant-api03-..."
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CapField
              id="daily-cap"
              label="Daily cap (USD)"
              value={form.dailyCap}
              onChange={(value) => setForm((current) => ({ ...current, dailyCap: value }))}
            />
            <CapField
              id="weekly-cap"
              label="Weekly cap (USD)"
              value={form.weeklyCap}
              onChange={(value) => setForm((current) => ({ ...current, weeklyCap: value }))}
            />
            <CapField
              id="monthly-cap"
              label="Monthly cap (USD)"
              value={form.monthlyCap}
              onChange={(value) => setForm((current) => ({ ...current, monthlyCap: value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="slack-token">Slack bot token (optional)</Label>
              <Input
                id="slack-token"
                type="password"
                value={form.slackBotToken}
                onChange={(event) => setForm((current) => ({ ...current, slackBotToken: event.target.value }))}
                placeholder="xoxb-..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slack-channel">Slack channel ID (optional)</Label>
              <Input
                id="slack-channel"
                value={form.slackChannel}
                onChange={(event) => setForm((current) => ({ ...current, slackChannel: event.target.value }))}
                placeholder="C01234567"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          {proxyKey ? (
            <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              <p className="font-semibold">Proxy key (copy now, shown only once)</p>
              <code className="mt-1 block break-all rounded bg-emerald-950/60 p-2 font-mono text-xs">{proxyKey}</code>
            </div>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating project..." : "Create Project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CapField({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
