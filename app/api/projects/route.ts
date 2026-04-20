import { z } from "zod";

import { createProject, listProjects } from "@/lib/db";
import { toPublicProject } from "@/lib/projects";

const projectSchema = z.object({
  name: z.string().min(2).max(80),
  anthropicApiKey: z.string().min(20),
  dailyCap: z.number().positive().max(10_000),
  weeklyCap: z.number().positive().max(50_000),
  monthlyCap: z.number().positive().max(100_000),
  slackBotToken: z.string().optional(),
  slackChannel: z.string().optional()
});

export const runtime = "nodejs";

export async function GET() {
  const projects = listProjects().map(toPublicProject);
  return Response.json({ projects });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid project input.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const values = parsed.data;

  if (values.weeklyCap < values.dailyCap || values.monthlyCap < values.weeklyCap) {
    return Response.json(
      {
        error: "Caps must increase with timeframe: daily <= weekly <= monthly."
      },
      { status: 400 }
    );
  }

  const created = createProject({
    name: values.name,
    anthropicApiKey: values.anthropicApiKey,
    dailyCap: values.dailyCap,
    weeklyCap: values.weeklyCap,
    monthlyCap: values.monthlyCap,
    slackBotToken: values.slackBotToken,
    slackChannel: values.slackChannel
  });

  return Response.json({
    project: toPublicProject(created.project),
    proxyKey: created.proxyKey,
    setup: {
      endpoint: "/api/proxy",
      header: "x-proxy-key"
    }
  });
}
