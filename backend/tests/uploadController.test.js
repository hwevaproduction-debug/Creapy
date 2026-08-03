const test = require('node:test');
const assert = require('node:assert/strict');

process.env.S3_ACCESS_KEY_ID = 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET = 'test-upload-bucket';
process.env.S3_PUBLIC_BASE_URL = 'https://test-upload-bucket.s3.us-east-1.amazonaws.com';
process.env.S3_REGION = 'us-east-1';

const uploadController = require('../controllers/uploadController');

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode: this.statusCode, body });
      },
    };

    handler(req, res, reject);
  });

test('signed upload URLs do not bind browser uploads to an empty-body checksum', async () => {
  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.searchParams.has('x-amz-checksum-crc32'), false);
  assert.equal(uploadUrl.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
  assert.equal(uploadUrl.searchParams.get('X-Amz-Expires'), '60');
  assert.match(result.body.data.key, /^avatars\/user_1\/\d+-[a-f0-9]{20}\.png$/);
});
