import type { ProjectRecord } from "@/lib/db";

export type PublicProject = {
  id: string;
  name: string;
  proxyKeyHint: string;
  dailyCap: number;
  weeklyCap: number;
  monthlyCap: number;
  slackConfigured: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicProject(project: ProjectRecord): PublicProject {
  return {
    id: project.id,
    name: project.name,
    proxyKeyHint: project.proxyKeyHint,
    dailyCap: project.dailyCap,
    weeklyCap: project.weeklyCap,
    monthlyCap: project.monthlyCap,
    slackConfigured: Boolean(project.slackBotToken && project.slackChannel),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}
