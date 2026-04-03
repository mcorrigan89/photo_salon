import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
