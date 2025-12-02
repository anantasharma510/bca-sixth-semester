import { Types } from 'mongoose';
import { NormalizedProduct } from '../types/style';
import { Product } from '../models/product.model';
import { uploadImageFromUrl } from '../utils/remoteUpload';

export interface StoredProduct {
  productId: Types.ObjectId;
  brand: string;
  source: string;
}

async function mergeColors(
  productId: string,
  colors: NormalizedProduct['colors']
): Promise<NormalizedProduct['colors']> {
  if (!colors?.length) {
    return [];
  }

  const uploads = await Promise.all(
    colors.map(async (color) => ({
      ...color,
      imageUrl: await uploadImageFromUrl(color.imageUrl, `style/products/${productId}/colors`),
    }))
  );

  return uploads;
}

function mergeDetails(
  existingLocales: NormalizedProduct['detail'][],
  nextDetail: NormalizedProduct['detail']
) {
  if (!nextDetail?.locale) return existingLocales;
  const filtered = existingLocales.filter((detail) => detail.locale !== nextDetail.locale);
  filtered.push(nextDetail);
  return filtered;
}

export async function persistScrapedProducts(
  products: (NormalizedProduct | null)[]
): Promise<StoredProduct[]> {
  const results: StoredProduct[] = [];

  for (const item of products) {
    if (!item) continue;

    const mainImageUrl = await uploadImageFromUrl(
      item.mainImageUrl,
      `style/products/${item.externalId}`
    );

    const colors = await mergeColors(item.externalId, item.colors);

    const existing = await Product.findOne({ externalId: item.externalId });

    if (!existing) {
      const created = await Product.create({
        brand: item.brand,
        source: item.source,
        externalId: item.externalId,
        name: item.name,
        description: item.description,
        mainImageUrl,
        productUrl: item.productUrl,
        colors,
        details: item.detail ? [item.detail] : [],
        metadata: { queryMeta: item.queryMeta, raw: item.raw },
      });

      const productId = created._id as Types.ObjectId;

      results.push({
        productId,
        brand: created.brand,
        source: created.source,
      });
      continue;
    }

    existing.brand = item.brand;
    existing.source = item.source;
    existing.name = item.name;
    existing.description = item.description || existing.description;
    existing.mainImageUrl = mainImageUrl || existing.mainImageUrl;
    existing.productUrl = item.productUrl || existing.productUrl;
    existing.colors = colors.length ? colors : existing.colors;
    existing.details = item.detail ? mergeDetails(existing.details, item.detail) : existing.details;
    existing.metadata = { ...(existing.metadata || {}), queryMeta: item.queryMeta, raw: item.raw };

    await existing.save();

    results.push({
      productId: existing._id as Types.ObjectId,
      brand: existing.brand,
      source: existing.source,
    });
  }

  return results;
}

