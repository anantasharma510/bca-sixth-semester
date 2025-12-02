var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { StyleGeneration } from '../models/styleGeneration.model';
import { Outfit } from '../models/outfit.model';
import { generateStylePlan } from './styleAi.service';
import { getSourceRequests, scrapeSources } from './scraper.service';
import { persistScrapedProducts } from './productStorage.service';
export function runStyleGenerationWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, form, profile, }) {
        const generation = yield StyleGeneration.create({
            userId,
            formInput: form,
            status: 'pending',
        });
        try {
            const plan = yield generateStylePlan(form, profile);
            const primaryOutfit = plan.outfits[0];
            if (!primaryOutfit) {
                throw new Error('AI did not return any outfits.');
            }
            const brandList = form.preferred_brand
                ? form.preferred_brand.split(',').map((brand) => brand.trim()).filter(Boolean)
                : [];
            const normalizedProducts = [];
            for (const item of primaryOutfit.items) {
                if (!item.query)
                    continue;
                const requests = getSourceRequests({
                    query: item.query,
                    key: item.key,
                    min: parseInt(item.min, 10) || 0,
                    max: parseInt(item.max, 10) || parseInt(form.budget, 10) || 500,
                    gender: profile.gender || 'all',
                    locale: profile.locale || 'en-US',
                    brands: brandList,
                });
                if (!requests.length)
                    continue;
                const scrapedResults = yield scrapeSources(requests);
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
                throw new Error('Could not find any products for the generated outfit.');
            }
            const storedProducts = yield persistScrapedProducts(normalizedProducts);
            const outfitItems = storedProducts.map((stored, index) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return ({
                    productId: stored.productId,
                    key: (_b = (_a = normalizedProducts[index]) === null || _a === void 0 ? void 0 : _a.queryMeta) === null || _b === void 0 ? void 0 : _b.key,
                    query: (_d = (_c = normalizedProducts[index]) === null || _c === void 0 ? void 0 : _c.queryMeta) === null || _d === void 0 ? void 0 : _d.query,
                    minPrice: ((_f = (_e = normalizedProducts[index]) === null || _e === void 0 ? void 0 : _e.queryMeta) === null || _f === void 0 ? void 0 : _f.min)
                        ? Number((_h = (_g = normalizedProducts[index]) === null || _g === void 0 ? void 0 : _g.queryMeta) === null || _h === void 0 ? void 0 : _h.min)
                        : undefined,
                    maxPrice: ((_k = (_j = normalizedProducts[index]) === null || _j === void 0 ? void 0 : _j.queryMeta) === null || _k === void 0 ? void 0 : _k.max)
                        ? Number((_m = (_l = normalizedProducts[index]) === null || _l === void 0 ? void 0 : _l.queryMeta) === null || _m === void 0 ? void 0 : _m.max)
                        : undefined,
                });
            });
            const outfit = yield Outfit.create({
                userId,
                generationId: generation._id,
                name: primaryOutfit.looks,
                description: primaryOutfit.description,
                items: outfitItems,
                isPublic: false,
            });
            generation.status = 'completed';
            generation.aiResponse = plan;
            generation.outfitId = outfit._id;
            generation.scrapedProductIds = storedProducts.map((product) => product.productId);
            yield generation.save();
            return {
                generationId: generation._id,
                outfitId: outfit._id,
                plan,
                storedProductIds: storedProducts.map((product) => product.productId),
            };
        }
        catch (error) {
            generation.status = 'failed';
            generation.failureReason = (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error';
            yield generation.save();
            throw error;
        }
    });
}
