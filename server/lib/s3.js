import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'af-south-1' });
const BUCKET = 'adma-zw';

export async function createPresignedPut(key, contentType) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });
  // Encode each path segment individually — never encode the '/' separator
  const publicUrl = `https://${BUCKET}.s3.af-south-1.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;
  return { uploadUrl, publicUrl };
}

export async function deleteS3Object(key) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // best-effort delete — don't fail the request if cleanup fails
  }
}

// Object metadata, or null if the key doesn't exist. Used by /api/upload/video-status
// to poll whether server/lambda/video-compress.js (S3-triggered, see that file's
// header comment for the full pipeline) has finished re-encoding an uploaded video
// down to size — it tags the object `processed: true` once done.
export async function getS3ObjectMetadata(key) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.Metadata || {};
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}
