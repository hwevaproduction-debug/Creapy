const s3Provider = require('./s3Provider');
const localProvider = require('./localProvider');

function getStorageProvider() {
  const providerName = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (providerName === 's3') return s3Provider;
  // default to local
  if (providerName === 'local') return localProvider;
  // unknown provider: fallback to local but warn
  return localProvider;
}

async function getSignedUploadUrl(opts) {
  const provider = getStorageProvider();
  if (!provider || typeof provider.getSignedUploadUrl !== 'function') {
    throw new Error('Selected storage provider does not implement getSignedUploadUrl');
  }
  return provider.getSignedUploadUrl(opts);
}

module.exports = { getStorageProvider, getSignedUploadUrl };
