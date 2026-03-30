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

export function getConnectionSettings(
  env: NodeJS.ProcessEnv = process.env
): ConnectionSettings {
  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL
  };
}

export function getObjectStorageSettings(
  env: NodeJS.ProcessEnv = process.env
): ObjectStorageSettings {
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
