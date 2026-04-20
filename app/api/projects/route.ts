import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionFromCookie, SESSION_COOKIE } from "@/lib/auth";
import { decryptSecret, encryptSecret, generateToken } from "@/lib/crypto";
import { db, type ProjectRow, type UserRow } from "@/lib/db";

export const runtime = "nodejs";

const createProjectSchema = z.object({
  name: z.string().min(2).max(80),
  anthropicKey: z.string().min(20).max(256),
  dailyCapUsd: z.number().positive().max(100000),
  weeklyCapUsd: z.number().positive().max(100000),
  monthlyCapUsd: z.number().positive().max(100000),
  slackWebhookUrl: z.string().url().optional().or(z.literal(""))
});

const updateProjectSchema = z.object({
  id: z.string().min(4),
  name: z.string().min(2).max(80).optional(),
  anthropicKey: z.string().min(20).max(256).optional(),
  dailyCapUsd: z.number().positive().max(100000).optional(),
  weeklyCapUsd: z.number().positive().max(100000).optional(),
  monthlyCapUsd: z.number().positive().max(100000).optional(),
  slackWebhookUrl: z.string().url().optional().or(z.literal("")),
  rotateProxyKey: z.boolean().optional()
});

type SessionUser = {
  id: number;
  email: string;
  paid: boolean;
};

function projectToResponse(project: ProjectRow) {
  return {
    id: project.id,
    name: project.name,
    proxyKeyPrefix: project.proxy_key_prefix,
    dailyCapUsd: project.daily_cap_usd,
    weeklyCapUsd: project.weekly_cap_usd,
    monthlyCapUsd: project.monthly_cap_usd,
    slackWebhookUrl: project.slack_webhook_url,
    createdAt: project.created_at,
    updatedAt: project.updated_at
  };
}

async function requirePaidUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionFromCookie(token);
  if (!session) {
    return null;
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(session.uid) as UserRow | undefined;
  if (!user || !user.paid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    paid: Boolean(user.paid)
  };
}

export async function GET(request: NextRequest) {
  const user = await requirePaidUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized or unpaid" }, { status: 402 });
  }

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
      .get(id, user.id) as ProjectRow | undefined;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        ...projectToResponse(project),
        anthropicKeyMasked: `${decryptSecret(project.anthropic_key_encrypted).slice(0, 8)}••••••••`
      }
    });
  }

  const projects = db
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as ProjectRow[];

  return NextResponse.json({
    projects: projects.map(projectToResponse)
  });
}

export async function POST(request: NextRequest) {
  const user = await requirePaidUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized or unpaid" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }

  const projectId = generateToken("proj_");
  const proxyKey = generateToken("cuc_");
  const proxyKeyHash = await hash(proxyKey, 10);

  db.prepare(
    `INSERT INTO projects (
      id,
      user_id,
      name,
      anthropic_key_encrypted,
      proxy_key_hash,
      proxy_key_prefix,
      daily_cap_usd,
      weekly_cap_usd,
      monthly_cap_usd,
      slack_webhook_url,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    projectId,
    user.id,
    parsed.data.name.trim(),
    encryptSecret(parsed.data.anthropicKey.trim()),
    proxyKeyHash,
    proxyKey.slice(0, 16),
    parsed.data.dailyCapUsd,
    parsed.data.weeklyCapUsd,
    parsed.data.monthlyCapUsd,
    parsed.data.slackWebhookUrl?.trim() ? parsed.data.slackWebhookUrl.trim() : null
  );

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .get(projectId, user.id) as ProjectRow | undefined;

  if (!project) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json(
    {
      project: projectToResponse(project),
      proxyKey
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const user = await requirePaidUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized or unpaid" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .get(parsed.data.id, user.id) as ProjectRow | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let nextProxyKeyHash = existing.proxy_key_hash;
  let nextProxyPrefix = existing.proxy_key_prefix;
  let rotatedProxyKey: string | null = null;

  if (parsed.data.rotateProxyKey) {
    rotatedProxyKey = generateToken("cuc_");
    nextProxyKeyHash = await hash(rotatedProxyKey, 10);
    nextProxyPrefix = rotatedProxyKey.slice(0, 16);
  }

  const nextName = parsed.data.name?.trim() ?? existing.name;
  const nextEncryptedAnthropicKey = parsed.data.anthropicKey
    ? encryptSecret(parsed.data.anthropicKey.trim())
    : existing.anthropic_key_encrypted;
  const nextDailyCap = parsed.data.dailyCapUsd ?? existing.daily_cap_usd;
  const nextWeeklyCap = parsed.data.weeklyCapUsd ?? existing.weekly_cap_usd;
  const nextMonthlyCap = parsed.data.monthlyCapUsd ?? existing.monthly_cap_usd;
  const nextSlackWebhook =
    parsed.data.slackWebhookUrl === undefined
      ? existing.slack_webhook_url
      : parsed.data.slackWebhookUrl?.trim()
        ? parsed.data.slackWebhookUrl.trim()
        : null;

  db.prepare(
    `UPDATE projects
     SET name = ?,
         anthropic_key_encrypted = ?,
         proxy_key_hash = ?,
         proxy_key_prefix = ?,
         daily_cap_usd = ?,
         weekly_cap_usd = ?,
         monthly_cap_usd = ?,
         slack_webhook_url = ?,
         updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    nextName,
    nextEncryptedAnthropicKey,
    nextProxyKeyHash,
    nextProxyPrefix,
    nextDailyCap,
    nextWeeklyCap,
    nextMonthlyCap,
    nextSlackWebhook,
    parsed.data.id,
    user.id
  );

  const updated = db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .get(parsed.data.id, user.id) as ProjectRow | undefined;

  if (!updated) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json({
    project: projectToResponse(updated),
    proxyKey: rotatedProxyKey
  });
}

export async function DELETE(request: NextRequest) {
  const user = await requirePaidUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized or unpaid" }, { status: 402 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .get(id, user.id) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, user.id);

  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return NextResponse.json({ allow: ["GET", "POST", "PATCH", "DELETE"] });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
