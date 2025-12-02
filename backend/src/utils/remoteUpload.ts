import { uploadToCloudinary } from './cloudinary';

export async function uploadImageFromUrl(
  imageUrl?: string,
  folder: string = 'style-products'
): Promise<string | undefined> {
  if (!imageUrl) return undefined;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: any = await uploadToCloudinary(buffer, folder, 'image');
    return uploadResult?.secure_url || uploadResult?.url || imageUrl;
  } catch (error) {
    console.warn(`Falling back to remote image URL (${imageUrl}) due to upload failure.`, error);
    return imageUrl;
  }
}

