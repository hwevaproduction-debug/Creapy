const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function _ensureS3Config() {
  const missing = [];
  if (!process.env.S3_BUCKET) missing.push('S3_BUCKET');
  if (!process.env.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
  if (!process.env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
  if (!process.env.S3_REGION && !process.env.AWS_REGION) missing.push('S3_REGION or AWS_REGION');
  if (missing.length) {
    throw new Error(`S3 provider misconfigured, missing env: ${missing.join(', ')}`);
  }
}

function _extFromContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') return 'bin';
  const parts = contentType.split('/');
  if (parts.length < 2) return 'bin';
  return parts[1].split('+')[0].replace(/[^a-z0-9]+/gi, '') || 'bin';
}

function _makeKey(folder = 'uploads', user = {}, contentType) {
  const userId = (user && (user.id || user._id || user.userId)) || 'anonymous';
  const ext = _extFromContentType(contentType);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const cleanFolder = (folder || 'uploads').replace(/^\/+|\/+$/g, '');
  return `${cleanFolder}/${userId}/${ts}-${rand}.${ext}`;
}

async function getSignedUploadUrl({ contentType, folder = 'uploads', user = {} } = {}) {
  _ensureS3Config();
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || process.env.AWS_REGION;

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const key = _makeKey(folder, user, contentType);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // expiry 60 seconds to match existing controller logic
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

  // public base url may be provided, otherwise derive a standard S3 URL
  const publicBase = (process.env.S3_PUBLIC_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/,'');
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, key, publicUrl };
}

module.exports = { getSignedUploadUrl };
