import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/lemonsqueezy";
import {
  createProjectForOwner,
  getProjectForOwner,
  listProjectsForOwner,
  rotateProjectProxyKey,
  updateProjectForOwner
} from "@/lib/projects";

const capSchema = z.object({
  dailyCapUsd: z.number().min(0.5).max(50000),
  weeklyCapUsd: z.number().min(0.5).max(50000),
  monthlyCapUsd: z.number().min(0.5).max(50000)
});

const createSchema = z.object({
  name: z.string().min(2).max(80),
  anthropicApiKey: z.string().min(20),
  slackWebhookUrl: z
    .string()
    .url()
    .includes("hooks.slack.com")
    .optional()
    .or(z.literal("")),
  caps: capSchema
});

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  anthropicApiKey: z.string().min(20).optional(),
  slackWebhookUrl: z
    .string()
    .url()
    .includes("hooks.slack.com")
    .optional()
    .or(z.literal("")),
  caps: capSchema.partial().optional(),
  rotateProxyKey: z.boolean().optional()
});

function validateCapConsistency(caps: {
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
}): string | null {
  if (caps.weeklyCapUsd < caps.dailyCapUsd) {
    return "Weekly cap must be greater than or equal to daily cap.";
  }

  if (caps.monthlyCapUsd < caps.weeklyCapUsd) {
    return "Monthly cap must be greater than or equal to weekly cap.";
  }

  return null;
}

async function requirePaidSession(request: NextRequest): Promise<
  | {
      email: string;
    }
  | NextResponse
> {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await hasActiveSubscription(session.email);

  if (!active) {
    return NextResponse.json(
      { error: "Active subscription required." },
      { status: 402 }
    );
  }

  return session;
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requirePaidSession(request);

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const projects = await listProjectsForOwner(sessionOrResponse.email);
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requirePaidSession(request);

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const capError = validateCapConsistency(parsed.data.caps);

  if (capError) {
    return NextResponse.json({ error: capError }, { status: 400 });
  }

  const created = await createProjectForOwner({
    ownerEmail: sessionOrResponse.email,
    name: parsed.data.name,
    anthropicApiKey: parsed.data.anthropicApiKey,
    slackWebhookUrl:
      parsed.data.slackWebhookUrl && parsed.data.slackWebhookUrl.length > 0
        ? parsed.data.slackWebhookUrl
        : null,
    caps: parsed.data.caps
  });

  return NextResponse.json(
    {
      project: created.project,
      proxyKey: created.proxyKey
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const sessionOrResponse = await requirePaidSession(request);

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await getProjectForOwner(sessionOrResponse.email, parsed.data.id);

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const mergedCaps = {
    dailyCapUsd: parsed.data.caps?.dailyCapUsd ?? existing.dailyCapUsd,
    weeklyCapUsd: parsed.data.caps?.weeklyCapUsd ?? existing.weeklyCapUsd,
    monthlyCapUsd: parsed.data.caps?.monthlyCapUsd ?? existing.monthlyCapUsd
  };

  const capError = validateCapConsistency(mergedCaps);

  if (capError) {
    return NextResponse.json({ error: capError }, { status: 400 });
  }

  const updated = await updateProjectForOwner({
    ownerEmail: sessionOrResponse.email,
    projectId: parsed.data.id,
    name: parsed.data.name,
    anthropicApiKey: parsed.data.anthropicApiKey,
    slackWebhookUrl:
      parsed.data.slackWebhookUrl !== undefined
        ? parsed.data.slackWebhookUrl || null
        : undefined,
    caps: parsed.data.caps
  });

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (parsed.data.rotateProxyKey) {
    const rotated = await rotateProjectProxyKey({
      ownerEmail: sessionOrResponse.email,
      projectId: parsed.data.id
    });

    if (!rotated) {
      return NextResponse.json(
        { error: "Unable to rotate proxy key" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: rotated.project, proxyKey: rotated.proxyKey });
  }

  return NextResponse.json({ project: updated });
}
