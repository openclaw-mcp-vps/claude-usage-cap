import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AlertLog, CheckoutSession, DataStore, Project, UsageEvent, User } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY_DATA: DataStore = {
  users: [],
  projects: [],
  usageEvents: [],
  alertLogs: [],
  checkoutSessions: []
};

let writeQueue: Promise<void> = Promise.resolve();

function cloneData(data: DataStore): DataStore {
  return {
    users: [...data.users],
    projects: [...data.projects],
    usageEvents: [...data.usageEvents],
    alertLogs: [...data.alertLogs],
    checkoutSessions: [...data.checkoutSessions]
  };
}

export async function readData(): Promise<DataStore> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DataStore>;

    return {
      users: parsed.users ?? [],
      projects: parsed.projects ?? [],
      usageEvents: parsed.usageEvents ?? [],
      alertLogs: parsed.alertLogs ?? [],
      checkoutSessions: parsed.checkoutSessions ?? []
    };
  } catch {
    return cloneData(EMPTY_DATA);
  }
}

async function persist(data: DataStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  const nextRaw = JSON.stringify(data, null, 2);
  const tempPath = `${DB_PATH}.${Date.now()}.tmp`;

  await writeFile(tempPath, nextRaw, "utf8");
  await rename(tempPath, DB_PATH);
}

export async function writeData(mutator: (data: DataStore) => void | DataStore): Promise<DataStore> {
  let finalSnapshot: DataStore = cloneData(EMPTY_DATA);

  writeQueue = writeQueue.then(async () => {
    const current = await readData();
    const draft = cloneData(current);
    const maybeNext = mutator(draft);
    finalSnapshot = maybeNext ? cloneData(maybeNext) : draft;
    await persist(finalSnapshot);
  });

  await writeQueue;
  return finalSnapshot;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const data = await readData();
  return data.users.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const data = await readData();
  return data.users.find((item) => item.id === id) ?? null;
}

export async function upsertUser(next: User): Promise<User> {
  await writeData((data) => {
    const index = data.users.findIndex((item) => item.id === next.id);

    if (index >= 0) {
      data.users[index] = next;
      return;
    }

    data.users.push(next);
  });

  return next;
}

export async function findProjectById(id: string): Promise<Project | null> {
  const data = await readData();
  return data.projects.find((item) => item.id === id) ?? null;
}

export async function findProjectByProxyHash(proxyKeyHash: string): Promise<Project | null> {
  const data = await readData();
  return data.projects.find((item) => item.proxyKeyHash === proxyKeyHash) ?? null;
}

export async function saveProject(next: Project): Promise<Project> {
  await writeData((data) => {
    const index = data.projects.findIndex((item) => item.id === next.id);

    if (index >= 0) {
      data.projects[index] = next;
      return;
    }

    data.projects.push(next);
  });

  return next;
}

export async function deleteProject(projectId: string): Promise<void> {
  await writeData((data) => {
    data.projects = data.projects.filter((item) => item.id !== projectId);
    data.usageEvents = data.usageEvents.filter((item) => item.projectId !== projectId);
    data.alertLogs = data.alertLogs.filter((item) => item.projectId !== projectId);
  });
}

export async function addUsageEvent(event: UsageEvent): Promise<void> {
  await writeData((data) => {
    data.usageEvents.push(event);
  });
}

export async function listUsageEvents(projectId: string): Promise<UsageEvent[]> {
  const data = await readData();
  return data.usageEvents
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function listProjectsByUserId(userId: string): Promise<Project[]> {
  const data = await readData();
  return data.projects.filter((item) => item.userId === userId);
}

export async function listAlertLogs(projectId: string): Promise<AlertLog[]> {
  const data = await readData();
  return data.alertLogs.filter((item) => item.projectId === projectId);
}

export async function addAlertLog(alert: AlertLog): Promise<void> {
  await writeData((data) => {
    data.alertLogs.push(alert);
  });
}

export async function addCheckoutSession(session: CheckoutSession): Promise<void> {
  await writeData((data) => {
    data.checkoutSessions.push(session);
  });
}
