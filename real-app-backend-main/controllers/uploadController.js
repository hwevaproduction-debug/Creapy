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

    if (!uploadUrl) {
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
