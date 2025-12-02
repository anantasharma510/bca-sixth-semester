var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { v2 as cloudinary } from 'cloudinary';
// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
export function uploadToCloudinary(buffer_1) {
    return __awaiter(this, arguments, void 0, function* (buffer, folder = 'posts', resourceType = 'image') {
        return new Promise((resolve, reject) => {
            const bufferSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            console.log(`☁️ Cloudinary upload initiated - Type: ${resourceType}, Buffer Size: ${bufferSizeMB}MB`);
            // Set a timeout for the upload (10 minutes for large videos)
            const uploadTimeout = setTimeout(() => {
                console.error('☁️ Cloudinary upload timeout');
                reject(new Error('Upload timeout - file too large or network issue'));
            }, 600000); // 10 minutes
            const uploadOptions = {
                folder,
                resource_type: resourceType,
            };
            // Add transformations based on resource type
            if (resourceType === 'image') {
                uploadOptions.transformation = [
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ];
            }
            else if (resourceType === 'video') {
                // For videos, we'll let Cloudinary handle the format automatically
                // and generate a thumbnail
                uploadOptions.eager = [
                    { width: 300, height: 300, crop: 'pad', quality: 'auto' }
                ];
                uploadOptions.eager_async = true;
                uploadOptions.eager_notification_url = null;
            }
            const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                clearTimeout(uploadTimeout); // Clear the timeout
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                }
                else {
                    console.log('Cloudinary upload success:', result);
                    resolve(result);
                }
            });
            uploadStream.end(buffer);
        });
    });
}
export function deleteFromCloudinary(publicId_1) {
    return __awaiter(this, arguments, void 0, function* (publicId, resourceType = 'image') {
        try {
            const result = yield cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            return result;
        }
        catch (error) {
            console.error('Error deleting from Cloudinary:', error);
            throw error;
        }
    });
}
