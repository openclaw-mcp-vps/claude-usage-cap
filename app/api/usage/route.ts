import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookie, SESSION_COOKIE } from "@/lib/auth";
import { db, type ProjectRow, type UserRow } from "@/lib/db";
import { getPeriodKeys, readCurrentSpend, readUsageSeries } from "@/lib/usage-tracker";

export const runtime = "nodejs";

async function requirePaidUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionFromCookie(token);
  if (!session) {
    return null;
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(session.uid) as UserRow | undefined;
  if (!user || !user.paid) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
  const user = await requirePaidUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized or unpaid" }, { status: 402 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(180, Math.floor(daysParam))) : 30;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .get(projectId, user.id) as ProjectRow | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const keys = getPeriodKeys();
  const spend = readCurrentSpend(project.id, keys);
  const series = readUsageSeries(project.id, days);

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      caps: {
        daily: project.daily_cap_usd,
        weekly: project.weekly_cap_usd,
        monthly: project.monthly_cap_usd
      }
    },
    spend,
    periodKeys: keys,
    series
  });
}
