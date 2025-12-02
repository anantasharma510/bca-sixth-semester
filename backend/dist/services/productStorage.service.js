var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Product } from '../models/product.model';
import { uploadImageFromUrl } from '../utils/remoteUpload';
function mergeColors(productId, colors) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(colors === null || colors === void 0 ? void 0 : colors.length)) {
            return [];
        }
        const uploads = yield Promise.all(colors.map((color) => __awaiter(this, void 0, void 0, function* () {
            return (Object.assign(Object.assign({}, color), { imageUrl: yield uploadImageFromUrl(color.imageUrl, `style/products/${productId}/colors`) }));
        })));
        return uploads;
    });
}
function mergeDetails(existingLocales, nextDetail) {
    if (!(nextDetail === null || nextDetail === void 0 ? void 0 : nextDetail.locale))
        return existingLocales;
    const filtered = existingLocales.filter((detail) => detail.locale !== nextDetail.locale);
    filtered.push(nextDetail);
    return filtered;
}
export function persistScrapedProducts(products) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        for (const item of products) {
            if (!item)
                continue;
            const mainImageUrl = yield uploadImageFromUrl(item.mainImageUrl, `style/products/${item.externalId}`);
            const colors = yield mergeColors(item.externalId, item.colors);
            const existing = yield Product.findOne({ externalId: item.externalId });
            if (!existing) {
                const created = yield Product.create({
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
                const productId = created._id;
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
            existing.metadata = Object.assign(Object.assign({}, (existing.metadata || {})), { queryMeta: item.queryMeta, raw: item.raw });
            yield existing.save();
            results.push({
                productId: existing._id,
                brand: existing.brand,
                source: existing.source,
            });
        }
        return results;
    });
}
