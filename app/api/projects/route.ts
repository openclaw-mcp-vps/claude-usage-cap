import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest, isUserPaid } from "@/lib/auth";
import { encryptSecret, generateOpaqueKey, hashSecret } from "@/lib/security";
import {
  deleteProject,
  findProjectById,
  listProjectsByUserId,
  saveProject
} from "@/lib/storage";
import { limitStatus, usageSeries } from "@/lib/usage-tracker";
import type { BillingCaps, Project } from "@/lib/types";

const capsSchema = z.object({
  dailyUsd: z.number().positive(),
  weeklyUsd: z.number().positive(),
  monthlyUsd: z.number().positive()
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  anthropicApiKey: z.string().trim().min(20),
  slackWebhookUrl: z.string().url().trim().nullable().optional(),
  caps: capsSchema
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  anthropicApiKey: z.string().trim().min(20).optional(),
  slackWebhookUrl: z.string().url().trim().nullable().optional(),
  caps: capsSchema.optional()
});

const deleteSchema = z.object({
  id: z.string().uuid()
});

function normalizeCaps(caps: BillingCaps): BillingCaps {
  const daily = Number(caps.dailyUsd.toFixed(2));
  const weekly = Number(caps.weeklyUsd.toFixed(2));
  const monthly = Number(caps.monthlyUsd.toFixed(2));

  return {
    dailyUsd: Math.max(daily, 0.01),
    weeklyUsd: Math.max(weekly, daily),
    monthlyUsd: Math.max(monthly, weekly)
  };
}

async function projectResponse(project: Project) {
  const status = await limitStatus(project);

  return {
    id: project.id,
    name: project.name,
    proxyKeyPrefix: project.proxyKeyPrefix,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    caps: project.caps,
    totals: status.totals,
    exceeded: status.exceeded,
    slackWebhookConfigured: Boolean(project.slackWebhookUrl)
  };
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const project = await findProjectById(id);

    if (!project || project.userId !== user.id) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const summary = await projectResponse(project);
    const series = await usageSeries(project.id, 30);

    return NextResponse.json({
      project: {
        ...summary,
        slackWebhookUrl: project.slackWebhookUrl,
        usageSeries: series,
        proxyEndpoint: `${request.nextUrl.origin}/api/proxy`
      }
    });
  }

  const projects = await listProjectsByUserId(user.id);
  const summaries = await Promise.all(projects.map((item) => projectResponse(item)));

  return NextResponse.json({ projects: summaries });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isUserPaid(user)) {
    return NextResponse.json({ error: "Active subscription required." }, { status: 402 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project payload." }, { status: 400 });
  }

  const rawProxyKey = generateOpaqueKey("clv_proxy_");
  const proxyKeyHash = hashSecret(rawProxyKey);
  const now = new Date().toISOString();

  const project: Project = {
    id: randomUUID(),
    userId: user.id,
    name: parsed.data.name,
    anthropicApiKeyEncrypted: encryptSecret(parsed.data.anthropicApiKey),
    proxyKeyHash,
    proxyKeyPrefix: `${rawProxyKey.slice(0, 14)}...`,
    createdAt: now,
    updatedAt: now,
    slackWebhookUrl: parsed.data.slackWebhookUrl ?? null,
    caps: normalizeCaps(parsed.data.caps)
  };

  await saveProject(project);

  return NextResponse.json({
    project: await projectResponse(project),
    proxyKey: rawProxyKey,
    proxyEndpoint: `${request.nextUrl.origin}/api/proxy`
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isUserPaid(user)) {
    return NextResponse.json({ error: "Active subscription required." }, { status: 402 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const project = await findProjectById(parsed.data.id);

  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const next: Project = {
    ...project,
    name: parsed.data.name ?? project.name,
    anthropicApiKeyEncrypted: parsed.data.anthropicApiKey
      ? encryptSecret(parsed.data.anthropicApiKey)
      : project.anthropicApiKeyEncrypted,
    slackWebhookUrl:
      parsed.data.slackWebhookUrl === undefined ? project.slackWebhookUrl : parsed.data.slackWebhookUrl,
    caps: parsed.data.caps ? normalizeCaps(parsed.data.caps) : project.caps,
    updatedAt: new Date().toISOString()
  };

  await saveProject(next);

  return NextResponse.json({
    project: await projectResponse(next)
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete payload." }, { status: 400 });
  }

  const project = await findProjectById(parsed.data.id);

  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await deleteProject(project.id);
  return NextResponse.json({ ok: true });
}
