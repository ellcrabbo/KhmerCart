import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

export type ConnectionSettings = {
  databaseUrl?: string;
  redisUrl?: string;
};

export type ObjectStorageSettings = {
  bucket?: string;
  endpoint?: string;
  key?: string;
  region: string;
  secret?: string;
};

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

let envLoaded = false;

function findWorkspaceRoot(startDir = process.cwd()): string {
  let currentDir = startDir;

  while (true) {
    if (existsSync(path.join(currentDir, WORKSPACE_MARKER))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}

function ensureWorkspaceEnv(): void {
  if (envLoaded) {
    return;
  }

  const workspaceRoot = findWorkspaceRoot();

  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(workspaceRoot, fileName);

    if (existsSync(filePath)) {
      loadEnv({ override: false, path: filePath, quiet: true });
    }
  }

  envLoaded = true;
}

export function getConnectionSettings(
  env: NodeJS.ProcessEnv = process.env
): ConnectionSettings {
  ensureWorkspaceEnv();

  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL
  };
}

export function getObjectStorageSettings(
  env: NodeJS.ProcessEnv = process.env
): ObjectStorageSettings {
  ensureWorkspaceEnv();

  return {
    bucket: env.S3_BUCKET,
    endpoint: env.S3_ENDPOINT,
    key: env.S3_KEY,
    region: env.S3_REGION?.trim() || "us-east-1",
    secret: env.S3_SECRET
  };
}

export function hasObjectStorageSettings(env: NodeJS.ProcessEnv = process.env): boolean {
  const settings = getObjectStorageSettings(env);

  return Boolean(settings.bucket && settings.endpoint && settings.key && settings.secret);
}
