import type { AppId, DependencyHealth, DependencyReport } from "@khmercart/core";
import { createHealthPayload } from "@khmercart/core";
import Redis from "ioredis";
import { Client } from "pg";
import { getConnectionSettings } from "./env";

function createPostgresClient(databaseUrl: string): Client {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  return new Client({
    database: url.pathname.replace(/^\//, "") || undefined,
    host: url.hostname,
    password: decodeURIComponent(url.password),
    port: url.port ? Number(url.port) : 5432,
    ssl:
      sslMode === "require"
        ? {
            rejectUnauthorized: false
          }
        : undefined,
    user: decodeURIComponent(url.username)
  });
}

function createRedisClient(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });
}

async function checkPostgres(databaseUrl: string): Promise<DependencyReport> {
  const client = createPostgresClient(databaseUrl);

  try {
    await client.connect();
    await client.query("select 1");

    return {
      detail: "Connection established and select 1 succeeded.",
      status: "up"
    };
  } catch (error) {
    return {
      detail:
        error instanceof Error ? error.message : "Unknown Postgres connection failure.",
      status: "down"
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function checkRedis(redisUrl: string): Promise<DependencyReport> {
  const redis = createRedisClient(redisUrl);

  try {
    await redis.connect();
    const response = await redis.ping();

    return {
      detail: `Redis replied with ${response}.`,
      status: response === "PONG" ? "up" : "down"
    };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : "Unknown Redis connection failure.",
      status: "down"
    };
  } finally {
    redis.disconnect();
  }
}

export async function checkDependencies(
  env: NodeJS.ProcessEnv = process.env
): Promise<DependencyHealth> {
  const { databaseUrl, redisUrl } = getConnectionSettings(env);

  const dependencies: DependencyHealth = {};

  dependencies.postgres = databaseUrl
    ? await checkPostgres(databaseUrl)
    : {
        detail: "DATABASE_URL is not configured.",
        status: "skipped"
      };

  dependencies.redis = redisUrl
    ? await checkRedis(redisUrl)
    : {
        detail: "REDIS_URL is not configured.",
        status: "skipped"
      };

  return dependencies;
}

export async function getHealthPayload(
  app: AppId,
  env: NodeJS.ProcessEnv = process.env
) {
  return createHealthPayload(app, await checkDependencies(env));
}
