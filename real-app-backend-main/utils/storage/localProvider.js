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
  const key = _makeKey(folder, user, contentType);

  const base = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/+$/,'');
  const path = `/uploads/${key}`;

  const publicUrl = base ? `${base}${path}` : '';
  // uploadUrl intentionally null to indicate client should POST to backend in later integration
  const uploadUrl = base ? `${base}${path}` : null;

  return { uploadUrl, key, publicUrl };
}

module.exports = { getSignedUploadUrl };
