// One-off script to backfill bannerImageUrl on existing outfits using
// the mainImageUrl of their first linked product.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Outfit } from '../dist/models/outfit.model.js';
import { Product } from '../dist/models/product.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function backfillOutfitBanners() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set in backend/.env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const outfits = await Outfit.find({
      $or: [{ bannerImageUrl: { $exists: false } }, { bannerImageUrl: null }],
    });
    console.log(`Found ${outfits.length} outfits without bannerImageUrl`);

    let updatedCount = 0;

    for (const outfit of outfits) {
      if (!outfit.items || !outfit.items.length) continue;

      const firstItem = outfit.items[0];
      if (!firstItem || !firstItem.productId) continue;

      const product = await Product.findById(firstItem.productId);
      if (!product || !product.mainImageUrl) continue;

      outfit.bannerImageUrl = product.mainImageUrl;
      await outfit.save();

      updatedCount++;
      console.log(
        `Updated outfit ${outfit._id} with bannerImageUrl from product ${product._id}`
      );
    }

    console.log(`Successfully backfilled bannerImageUrl for ${updatedCount} outfits`);
  } catch (err) {
    console.error('Error backfilling outfit banners:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

backfillOutfitBanners();



