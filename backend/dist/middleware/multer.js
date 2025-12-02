import multer from 'multer';
// Configure multer for memory storage
const storage = multer.memoryStorage();
// File filter to allow images and videos
const fileFilter = (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image and video files are allowed'));
    }
};
// Configure multer with different limits for images and videos
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for images
    },
});
// Separate upload configuration for videos with higher limits
export const uploadWithVideo = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    },
});
