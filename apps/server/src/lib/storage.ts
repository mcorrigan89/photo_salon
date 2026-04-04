import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@photo-salon/logger";
import { getServerEnv } from "@photo-salon/env/server";

let s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (!s3Client) {
    const env = getServerEnv();
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function getBucket(): string {
  return getServerEnv().S3_BUCKET;
}

export async function ensureBucket(): Promise<void> {
  const bucket = getBucket();
  const client = getS3();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    logger.info(`S3 bucket "${bucket}" exists`);
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NotFound" || code === "NoSuchBucket" || code === "404") {
      logger.info(`S3 bucket "${bucket}" not found, creating...`);
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      logger.info(`S3 bucket "${bucket}" created`);
    } else {
      logger.warn(`Could not verify S3 bucket "${bucket}": ${code}`);
    }
  }
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteFile(key: string): Promise<void> {
  await getS3().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

export async function getSignedViewUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSignedUrl(getS3() as any, command, { expiresIn });
}
