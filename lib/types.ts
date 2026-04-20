export type BillingCaps = {
  dailyUsd: number;
  weeklyUsd: number;
  monthlyUsd: number;
};

export type User = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  paidUntil: string | null;
  subscriptionStatus: "active" | "inactive" | "past_due";
  lemonCustomerId: string | null;
  lemonSubscriptionId: string | null;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  anthropicApiKeyEncrypted: string;
  proxyKeyHash: string;
  proxyKeyPrefix: string;
  createdAt: string;
  updatedAt: string;
  slackWebhookUrl: string | null;
  caps: BillingCaps;
};

export type UsageEvent = {
  id: string;
  projectId: string;
  requestId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
};

export type AlertLog = {
  id: string;
  projectId: string;
  period: "daily" | "weekly" | "monthly";
  periodStart: string;
  createdAt: string;
  message: string;
};

export type CheckoutSession = {
  id: string;
  userId: string;
  createdAt: string;
  source: "lemonsqueezy";
  paid: boolean;
};

export type DataStore = {
  users: User[];
  projects: Project[];
  usageEvents: UsageEvent[];
  alertLogs: AlertLog[];
  checkoutSessions: CheckoutSession[];
};

export type SessionClaims = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};
