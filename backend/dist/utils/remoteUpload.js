var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { uploadToCloudinary } from './cloudinary';
export function uploadImageFromUrl(imageUrl_1) {
    return __awaiter(this, arguments, void 0, function* (imageUrl, folder = 'style-products') {
        if (!imageUrl)
            return undefined;
        try {
            const response = yield fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.status}`);
            }
            const arrayBuffer = yield response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const uploadResult = yield uploadToCloudinary(buffer, folder, 'image');
            return (uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.secure_url) || (uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.url) || imageUrl;
        }
        catch (error) {
            console.warn(`Falling back to remote image URL (${imageUrl}) due to upload failure.`, error);
            return imageUrl;
        }
    });
}
