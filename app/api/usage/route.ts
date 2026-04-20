import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/lemonsqueezy";
import { getProjectForOwner } from "@/lib/projects";
import {
  evaluateCapStatus,
  getDailyUsageSeries,
  getUsageTotals
} from "@/lib/usage-tracker";

const querySchema = z.object({
  projectId: z.string().uuid(),
  days: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return 30;
      }

      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return 30;
      }

      return Math.max(7, Math.min(90, Math.floor(parsed)));
    })
});

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paid = await hasActiveSubscription(session.email);

  if (!paid) {
    return NextResponse.json(
      { error: "Active subscription required." },
      { status: 402 }
    );
  }

  const parsed = querySchema.safeParse({
    projectId: request.nextUrl.searchParams.get("projectId"),
    days: request.nextUrl.searchParams.get("days") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await getProjectForOwner(session.email, parsed.data.projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [totals, series] = await Promise.all([
    getUsageTotals(project.id),
    getDailyUsageSeries(project.id, parsed.data.days)
  ]);

  const capStatus = evaluateCapStatus(project, totals);

  return NextResponse.json({
    project,
    totals,
    capStatus,
    series
  });
}
