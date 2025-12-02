import { Types } from 'mongoose';
import { StyleGeneration } from '../models/styleGeneration.model';
import { Outfit } from '../models/outfit.model';
import { generateStylePlan } from './styleAi.service';
import { getSourceRequests, scrapeSources } from './scraper.service';
import { persistScrapedProducts } from './productStorage.service';
import { GenerateFormInput, StylePlan, StyleProfileInput, NormalizedProduct } from '../types/style';

interface GenerationWorkflowArgs {
  userId: string;
  form: GenerateFormInput;
  profile: StyleProfileInput;
}

interface GenerationWorkflowResult {
  generationId: Types.ObjectId;
  outfitId?: Types.ObjectId;
  plan: StylePlan;
  storedProductIds: Types.ObjectId[];
}

export async function runStyleGenerationWorkflow({
  userId,
  form,
  profile,
}: GenerationWorkflowArgs): Promise<GenerationWorkflowResult> {
  const generation = await StyleGeneration.create({
    userId,
    formInput: {
      preparingFor: form.preparing_for,
      preferredBrand: form.preferred_brand,
      budget: form.budget,
      description: form.description,
    },
    status: 'pending',
  });

  try {
    const plan = await generateStylePlan(form, profile);

    // Clamp to a maximum of 5 outfits per generation to keep the UI concise
    // and avoid overloading the scraping pipeline.
    plan.outfits = plan.outfits.slice(0, 5);

    const primaryOutfit = plan.outfits[0];

    if (!primaryOutfit) {
      throw new Error('AI did not return any outfits.');
    }

    const brandList = form.preferred_brand
      ? form.preferred_brand.split(',').map((brand) => brand.trim()).filter(Boolean)
      : [];

    const normalizedProducts: NormalizedProduct[] = [];

    for (const item of primaryOutfit.items) {
      if (!item.query) continue;
      const requests = getSourceRequests({
        query: item.query,
        key: item.key,
        min: parseInt(item.min, 10) || 0,
        max: parseInt(item.max, 10) || parseInt(form.budget, 10) || 500,
        gender: profile.gender || 'all',
        locale: profile.locale || 'en-US',
        brands: brandList,
      });

      if (!requests.length) continue;

      const scrapedResults = await scrapeSources(requests);
      const firstMatch = scrapedResults.find((result) => result !== null);

      if (firstMatch) {
        firstMatch.queryMeta = {
          key: item.key,
          query: item.query,
          min: item.min,
          max: item.max,
          type: item.type,
          brand: item.brand,
        };

        normalizedProducts.push(firstMatch);
      }
    }

    if (!normalizedProducts.length) {
      // No products were found for any of the outfit items.
      // Mark the generation as completed (AI plan is still useful)
      // and return an empty product list instead of throwing.
      generation.status = 'completed';
      generation.aiResponse = plan;
      generation.scrapedProductIds = [];
      await generation.save();

      return {
        generationId: generation._id as Types.ObjectId,
        outfitId: undefined,
        plan,
        storedProductIds: [],
      };
    }

    const storedProducts = await persistScrapedProducts(normalizedProducts);
    const outfitItems = storedProducts.map((stored, index) => ({
      productId: stored.productId,
      key: normalizedProducts[index]?.queryMeta?.key,
      query: normalizedProducts[index]?.queryMeta?.query,
      minPrice: normalizedProducts[index]?.queryMeta?.min
        ? Number(normalizedProducts[index]?.queryMeta?.min)
        : undefined,
      maxPrice: normalizedProducts[index]?.queryMeta?.max
        ? Number(normalizedProducts[index]?.queryMeta?.max)
        : undefined,
    }));

    const outfit = await Outfit.create({
      userId,
      generationId: generation._id,
      name: primaryOutfit.looks,
      description: primaryOutfit.description,
      bannerImageUrl: normalizedProducts[0]?.mainImageUrl,
      items: outfitItems,
      isPublic: false,
    });

    generation.status = 'completed';
    generation.aiResponse = plan;
    generation.outfitId = outfit._id as Types.ObjectId;
    generation.scrapedProductIds = storedProducts.map((product) => product.productId);
    await generation.save();

    return {
      generationId: generation._id as Types.ObjectId,
      outfitId: outfit._id as Types.ObjectId,
      plan,
      storedProductIds: storedProducts.map((product) => product.productId),
    };
  } catch (error: any) {
    generation.status = 'failed';
    generation.failureReason = error?.message || 'Unknown error';
    await generation.save();
    throw error;
  }
}

