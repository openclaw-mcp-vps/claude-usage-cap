import { z } from "zod";

import { getProjectById } from "@/lib/db";
import { buildDailyUsageSeries, evaluateCapState, getCurrentSpend } from "@/lib/usage-tracker";

const usageQuerySchema = z.object({
  projectId: z.string().uuid(),
  days: z.coerce.number().int().min(7).max(90).default(30)
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = usageQuerySchema.safeParse({
    projectId: url.searchParams.get("projectId"),
    days: url.searchParams.get("days") || "30"
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid projectId or days query parameters.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const project = getProjectById(parsed.data.projectId);

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const spend = getCurrentSpend(project.id);
  const cap = evaluateCapState({
    caps: {
      dailyCap: project.dailyCap,
      weeklyCap: project.weeklyCap,
      monthlyCap: project.monthlyCap
    },
    spend: {
      daily: spend.daily,
      weekly: spend.weekly,
      monthly: spend.monthly
    }
  });

  return Response.json({
    projectId: project.id,
    capStatus: cap.states,
    series: buildDailyUsageSeries(project.id, parsed.data.days)
  });
}
