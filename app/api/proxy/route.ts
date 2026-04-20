import { NextRequest, NextResponse } from "next/server";

import { isUserPaid } from "@/lib/auth";
import { proxyAnthropicRequest } from "@/lib/anthropic-proxy";
import { hashSecret } from "@/lib/security";
import { findProjectByProxyHash, findUserById } from "@/lib/storage";
import { sendSlackAlert } from "@/lib/slack-alerts";
import { limitStatus, markLimitAlertSent, recordUsage, shouldSendLimitAlert } from "@/lib/usage-tracker";

function extractProxyKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-proxy-key");

  if (headerKey) {
    return headerKey.trim();
  }

  const authorization = request.headers.get("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
}

async function alertIfNeeded(params: {
  projectId: string;
  period: "daily" | "weekly" | "monthly";
  message: string;
  slackWebhookUrl: string | null;
}) {
  const shouldSend = await shouldSendLimitAlert(params.projectId, params.period);

  if (!shouldSend) {
    return;
  }

  await markLimitAlertSent({
    projectId: params.projectId,
    period: params.period,
    message: params.message
  });

  if (params.slackWebhookUrl) {
    await sendSlackAlert(params.slackWebhookUrl, params.message);
  }
}

export async function POST(request: NextRequest) {
  const proxyKey = extractProxyKey(request);

  if (!proxyKey) {
    return NextResponse.json(
      {
        error: "Proxy key missing. Provide x-proxy-key or Bearer token."
      },
      { status: 401 }
    );
  }

  const project = await findProjectByProxyHash(hashSecret(proxyKey));

  if (!project) {
    return NextResponse.json({ error: "Invalid proxy key." }, { status: 401 });
  }

  const user = await findUserById(project.userId);

  if (!user || !isUserPaid(user)) {
    return NextResponse.json(
      {
        error: "Project subscription is inactive. Reactivate to continue proxying requests."
      },
      { status: 402 }
    );
  }

  const before = await limitStatus(project);

  if (before.exceeded) {
    const message = `Claude Usage Cap blocked project ${project.name}: ${before.exceeded} cap reached (${before.totals[before.exceeded]} USD used).`;

    await alertIfNeeded({
      projectId: project.id,
      period: before.exceeded,
      message,
      slackWebhookUrl: project.slackWebhookUrl
    });

    return NextResponse.json(
      {
        error: "usage_cap_exceeded",
        message: `Usage blocked: ${before.exceeded} spend cap reached.`,
        totals: before.totals,
        caps: before.caps
      },
      {
        status: 429,
        headers: {
          "x-claude-proxy-project": project.id
        }
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const proxied = await proxyAnthropicRequest({
    project,
    requestBody: body,
    requestHeaders: request.headers
  });

  if (proxied.usage) {
    await recordUsage({
      projectId: project.id,
      requestId: proxied.usage.requestId,
      model: proxied.usage.model,
      inputTokens: proxied.usage.inputTokens,
      outputTokens: proxied.usage.outputTokens,
      costUsd: proxied.usage.costUsd
    });

    const after = await limitStatus(project);

    if (after.exceeded) {
      const message = `Claude Usage Cap alert for ${project.name}: ${after.exceeded} cap reached. Blocking subsequent calls until next billing window.`;

      await alertIfNeeded({
        projectId: project.id,
        period: after.exceeded,
        message,
        slackWebhookUrl: project.slackWebhookUrl
      });
    }
  }

  if (typeof proxied.body === "string") {
    return new NextResponse(proxied.body, {
      status: proxied.status,
      headers: {
        "content-type": "application/json",
        "x-claude-proxy-project": project.id
      }
    });
  }

  return NextResponse.json(proxied.body, {
    status: proxied.status,
    headers: {
      "x-claude-proxy-project": project.id
    }
  });
}
