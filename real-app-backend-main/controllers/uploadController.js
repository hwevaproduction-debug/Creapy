const AppError = require('../utils/appError');
const storage = require('../utils/storage');

exports.getSignedUploadUrl = async (req, res, next) => {
  try {
    const { contentType, folder = 'uploads' } = req.query;
    const normalizedFolder = String(folder || 'uploads').toLowerCase();

    if (!contentType) {
      return res.status(400).json({ status: 'fail', message: 'contentType is required' });
    }

    if (normalizedFolder === 'listings') {
      if (!req.user || req.user.role !== 'landlord') {
        return res.status(403).json({
          status: 'fail',
          message: 'Landlord role required to publish listings',
        });
      }
    }

    // Delegate to the storage provider abstraction
    const result = await storage.getSignedUploadUrl({ contentType, folder: normalizedFolder, user: req.user });

    const uploadUrl = result?.uploadUrl;
    const key = result?.key;
    const publicUrl = result?.publicUrl;

    // Maintain previous error behaviour for missing public URL
    if (!publicUrl) {
      return next(new AppError('Upload public URL is not configured', 500));
    }

    if (!key) {
      return next(new AppError('Storage provider did not return upload key', 500));
    }

    // Allow local storage provider to return a null/undefined uploadUrl
    if (uploadUrl == null) {
      const provider = String(process.env.STORAGE_PROVIDER || '').toLowerCase();
      if (provider === 'local') {
        return res.status(200).json({
          status: 'success',
          data: { uploadUrl: uploadUrl || null, key, publicUrl },
        });
      }

      return next(new AppError('Failed to create signed upload URL', 500));
    }

    return res.status(200).json({
      status: 'success',
      data: { uploadUrl, key, publicUrl },
    });
  } catch (err) {
    return next(err);
  }
};

// Server-side upload endpoint accepting Base64 file payloads
// Body: { contentType, folder, fileBase64 }
exports.uploadFile = async (req, res, next) => {
  try {
    const { contentType, folder = 'uploads', fileBase64 } = req.body || {};

    if (!contentType) {
      return res.status(400).json({ status: 'fail', message: 'contentType is required' });
    }

    if (!fileBase64) {
      return res.status(400).json({ status: 'fail', message: 'fileBase64 is required' });
    }

    const normalizedFolder = String(folder || 'uploads').toLowerCase();

    if (normalizedFolder === 'listings') {
      if (!req.user || req.user.role !== 'landlord') {
        return res.status(403).json({ status: 'fail', message: 'Landlord role required to publish listings' });
      }
    }

    // Only support server-side upload for local storage provider
    const providerName = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    if (providerName !== 'local') {
      return next(new AppError('Server-side uploads are only supported for local storage provider', 400));
    }

    const storage = require('../utils/storage');
    const result = await storage.getSignedUploadUrl({ contentType, folder: normalizedFolder, user: req.user });
    const key = result?.key;
    const publicUrl = result?.publicUrl;

    if (!publicUrl) {
      return next(new AppError('Upload public URL is not configured', 500));
    }
    if (!key) {
      return next(new AppError('Storage provider did not return upload key', 500));
    }

    // Decode base64 and write to disk
    const fs = require('fs').promises;
    const path = require('path');
    const uploadsDir = process.env.UPLOADS_DIR || '/srv/uploads';
    const targetPath = path.join(uploadsDir, key);
    const targetDir = path.dirname(targetPath);

    await fs.mkdir(targetDir, { recursive: true });
    const buffer = Buffer.from(fileBase64, 'base64');
    await fs.writeFile(targetPath, buffer, { mode: 0o644 });

    return res.status(200).json({ status: 'success', data: { uploadUrl: null, key, publicUrl } });
  } catch (err) {
    return next(err);
  }
};
