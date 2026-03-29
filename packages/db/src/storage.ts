import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getObjectStorageSettings } from "./env";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

function createStorageError(message: string): never {
  throw new Error(message);
}

function getRequiredStorageSettings() {
  const settings = getObjectStorageSettings(process.env);

  if (!settings.bucket || !settings.endpoint || !settings.key || !settings.secret) {
    return createStorageError(
      "Object storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_KEY, and S3_SECRET."
    );
  }

  return {
    bucket: settings.bucket,
    endpoint: settings.endpoint,
    key: settings.key,
    region: settings.region,
    secret: settings.secret
  };
}

function createS3Client() {
  const settings = getRequiredStorageSettings();

  return new S3Client({
    credentials: {
      accessKeyId: settings.key,
      secretAccessKey: settings.secret
    },
    endpoint: settings.endpoint,
    forcePathStyle: true,
    region: settings.region
  });
}

export async function createSignedUploadUrl(input: {
  contentType: string;
  key: string;
}): Promise<string> {
  const settings = getRequiredStorageSettings();
  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: settings.bucket,
    ContentType: input.contentType,
    Key: input.key
  });

  return getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
}

export async function createSignedDownloadUrl(key: string): Promise<string> {
  const settings = getRequiredStorageSettings();
  const client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: settings.bucket,
    Key: key
  });

  return getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
}

export function getSignedUrlTtlSeconds(): number {
  return SIGNED_URL_TTL_SECONDS;
}
