import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils";

type ProjectSummary = {
  id: string;
  name: string;
  proxyKeyPrefix: string;
  caps: {
    dailyUsd: number;
    weeklyUsd: number;
    monthlyUsd: number;
  };
  totals: {
    daily: number;
    weekly: number;
    monthly: number;
  };
};

function ratio(current: number, cap: number): number {
  if (cap <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / cap) * 100));
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{project.name}</CardTitle>
          <span className="rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1 text-xs text-[#9da7b3]">
            {project.proxyKeyPrefix}
          </span>
        </div>
        <CardDescription>Hard stops with daily, weekly, and monthly spending caps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#9da7b3]">Today</span>
            <span>
              {formatUsd(project.totals.daily)} / {formatUsd(project.caps.dailyUsd)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#161b22]">
            <div
              className="h-full rounded-full bg-[#2f81f7]"
              style={{ width: `${ratio(project.totals.daily, project.caps.dailyUsd)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#9da7b3]">This week</span>
            <span>
              {formatUsd(project.totals.weekly)} / {formatUsd(project.caps.weeklyUsd)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#161b22]">
            <div
              className="h-full rounded-full bg-[#3fb950]"
              style={{ width: `${ratio(project.totals.weekly, project.caps.weeklyUsd)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#9da7b3]">This month</span>
            <span>
              {formatUsd(project.totals.monthly)} / {formatUsd(project.caps.monthlyUsd)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#161b22]">
            <div
              className="h-full rounded-full bg-[#f0883e]"
              style={{ width: `${ratio(project.totals.monthly, project.caps.monthlyUsd)}%` }}
            />
          </div>
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117] text-sm font-semibold hover:border-[#2f81f7]"
        >
          Open project
        </Link>
      </CardContent>
    </Card>
  );
}
