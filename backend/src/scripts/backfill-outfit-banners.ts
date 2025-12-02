import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Outfit } from '../models/outfit.model';
import { Product } from '../models/product.model';

dotenv.config();

async function backfillOutfitBanners() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const outfits = await Outfit.find({ $or: [{ bannerImageUrl: { $exists: false } }, { bannerImageUrl: null }] });
    console.log(`Found ${outfits.length} outfits without bannerImageUrl`);

    let updatedCount = 0;

    for (const outfit of outfits) {
      if (!outfit.items?.length) continue;

      const firstItem = outfit.items[0];
      if (!firstItem?.productId) continue;

      const product = await Product.findById(firstItem.productId);
      if (!product?.mainImageUrl) continue;

      outfit.bannerImageUrl = product.mainImageUrl;
      await outfit.save();

      updatedCount++;
      console.log(`Updated outfit ${outfit._id} with bannerImageUrl from product ${product._id}`);
    }

    console.log(`Successfully backfilled bannerImageUrl for ${updatedCount} outfits`);
  } catch (error) {
    console.error('Error backfilling outfit banners:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

backfillOutfitBanners();


