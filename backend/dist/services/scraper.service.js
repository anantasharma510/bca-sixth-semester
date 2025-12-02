var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const hasOxylabsCredentials = Boolean(process.env.OXY_UNAME && process.env.OXY_PASS);
const HM_DEPARTMENT = {
    male: 'men_all',
    men: 'men_all',
    man: 'men_all',
    female: 'ladies_all',
    woman: 'ladies_all',
    women: 'ladies_all',
};
const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Referer: 'https://www.zara.com/',
};
export function getSourceRequests(args) {
    const { query, key, min, max, gender, locale, brands } = args;
    const normalizedLocale = locale.includes('-')
        ? locale.split('-').map((segment, index, arr) => (index === arr.length - 1 ? segment.toUpperCase() : segment)).join('-')
        : locale.split('_').map((segment, index, arr) => (index === arr.length - 1 ? segment.toUpperCase() : segment)).join('_');
    const normalizedBrands = brands.map((brand) => brand.trim().toLowerCase());
    const sources = [
        {
            src: 'zara',
            url: `https://www.zara.com/itxrest/1/search/store/22701/query?query=${encodeURIComponent(query)}&locale=en_US&deviceType=desktop&catalogue=79051&warehouse=33551&section=${['male', 'men', 'man'].includes(gender.toLowerCase()) ? 'MAN' : 'WOMAN'}&offset=0&limit=1&scope=default&origin=default&ajax=true&filter=priceFilter:0-${Math.max(Math.floor(max) * 100, 20000)}`,
            backup: `https://www.zara.com/itxrest/1/search/store/22701/query?query=${encodeURIComponent(key)}&locale=en_US&deviceType=desktop&catalogue=79051&warehouse=33551&section=${['male', 'men', 'man'].includes(gender.toLowerCase()) ? 'MAN' : 'WOMAN'}&offset=0&limit=1&scope=default&origin=default&ajax=true`,
            locale: normalizedLocale,
            gender,
            key,
            query,
            min,
            max,
            brands: normalizedBrands,
        },
        {
            src: 'hm',
            url: `https://api.hm.com/search-services/v1/en_us/search/resultpage?query=${encodeURIComponent(query)}&rFacets=price:0.000|${max}&touchPoint=desktop&page=1&pageSize=1&sort=RELEVANCE&department=${HM_DEPARTMENT[gender.toLowerCase()] || 'all'}`,
            backup: `https://api.hm.com/search-services/v1/${locale
                .split('-')
                .join('_')
                .toLowerCase()}/search/resultpage?query=${encodeURIComponent(key)}&touchPoint=desktop&page=1&pageSize=1&sort=RELEVANCE&department=${HM_DEPARTMENT[gender.toLowerCase()] || 'all'}`,
            locale: normalizedLocale,
            gender,
            key,
            query,
            min,
            max,
            brands: normalizedBrands,
        },
    ];
    if (normalizedBrands.length === 0) {
        return sources;
    }
    return sources.filter((source) => normalizedBrands.includes(source.src));
}
function scrapeWithFetch(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, headers = {}) {
        const response = yield fetch(url, {
            headers: Object.assign(Object.assign({}, DEFAULT_HEADERS), headers),
        });
        if (!response.ok) {
            throw new Error(`Fetch failed with status ${response.status}`);
        }
        return response;
    });
}
function scrapeWithOxylabs(url) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        if (!hasOxylabsCredentials) {
            throw new Error('Oxylabs credentials are missing');
        }
        const payload = {
            source: 'universal_ecommerce',
            url,
        };
        const auth = Buffer.from(`${process.env.OXY_UNAME}:${process.env.OXY_PASS}`).toString('base64');
        const response = yield fetch('https://realtime.oxylabs.io/v1/queries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Oxylabs failed with status ${response.status}`);
        }
        const data = yield response.json();
        return new Response((_c = (_b = (_a = data.results) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : '', { status: 200 });
    });
}
function scrapeZara(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield scrapeWithFetch(url);
            const json = (yield res.json());
            return json.results || [];
        }
        catch (error) {
            console.warn('Zara fetch failed, trying Oxylabs...', error);
            if (!hasOxylabsCredentials)
                throw error;
            const res = yield scrapeWithOxylabs(url);
            const json = (yield res.json());
            return json.results || [];
        }
    });
}
function scrapeHM(url) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const res = yield scrapeWithFetch(url, { 'x-client-id': 'style-up-generator' });
            const json = (yield res.json());
            return ((_a = json.searchHits) === null || _a === void 0 ? void 0 : _a.productList) || [];
        }
        catch (error) {
            console.warn('HM fetch failed, trying Oxylabs...', error);
            if (!hasOxylabsCredentials)
                throw error;
            const res = yield scrapeWithOxylabs(url);
            const json = (yield res.json());
            return ((_b = json.searchHits) === null || _b === void 0 ? void 0 : _b.productList) || [];
        }
    });
}
function mapZaraProduct(product, locale, meta) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!(product === null || product === void 0 ? void 0 : product.id) || !((_a = product.content) === null || _a === void 0 ? void 0 : _a.name)) {
        return null;
    }
    const seoKeyword = ((_b = product.content.seo) === null || _b === void 0 ? void 0 : _b.keyword) || ((_c = product.content.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().replace(/\s+/g, '-'));
    const seoId = ((_d = product.content.seo) === null || _d === void 0 ? void 0 : _d.seoProductId) || product.id;
    const detail = {
        locale: locale.toLowerCase(),
        currency: 'USD',
        price: (_e = product.content.price) !== null && _e !== void 0 ? _e : undefined,
        productUrl: `https://www.zara.com/us/en/${seoKeyword}-p${seoId}.html`,
        availability: product.content.availability,
    };
    const colors = ((_g = (_f = product.content.detail) === null || _f === void 0 ? void 0 : _f.colors) === null || _g === void 0 ? void 0 : _g.map((color) => {
        var _a, _b;
        return ({
            name: (color === null || color === void 0 ? void 0 : color.name) || 'Default',
            code: color === null || color === void 0 ? void 0 : color.id,
            imageUrl: (_b = (_a = color === null || color === void 0 ? void 0 : color.xmedia) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url,
        });
    })) || [];
    return {
        brand: 'Zara',
        source: 'zara',
        externalId: product.id,
        name: product.content.name,
        description: `${product.content.sectionName || ''} ${product.content.familyName || ''}`.trim(),
        mainImageUrl: (_j = (_h = product.content.xmedia) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.url,
        productUrl: detail.productUrl,
        colors,
        detail,
        raw: product,
        queryMeta: {
            key: meta.key,
            query: meta.query,
            min: meta.min.toString(),
            max: meta.max.toString(),
            type: 'zara',
            brand: 'zara',
        },
    };
}
function mapHMProduct(product, locale, meta) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!(product === null || product === void 0 ? void 0 : product.id) || !product.productName) {
        return null;
    }
    const primaryPrice = (_a = product.prices) === null || _a === void 0 ? void 0 : _a[0];
    const currency = ((_c = (_b = primaryPrice === null || primaryPrice === void 0 ? void 0 : primaryPrice.formattedPrice) === null || _b === void 0 ? void 0 : _b.match(/^[A-Za-z$€£¥₺₩₱]+/)) === null || _c === void 0 ? void 0 : _c[0]) ||
        ((_e = (_d = primaryPrice === null || primaryPrice === void 0 ? void 0 : primaryPrice.formattedPrice) === null || _d === void 0 ? void 0 : _d.split(/\s+/)) === null || _e === void 0 ? void 0 : _e[0]) ||
        'USD';
    const detail = {
        locale: locale.toLowerCase(),
        currency,
        price: primaryPrice === null || primaryPrice === void 0 ? void 0 : primaryPrice.price,
        productUrl: product.url ? `https://www2.hm.com${product.url}` : undefined,
        availability: (_f = product.availability) === null || _f === void 0 ? void 0 : _f.stockState,
    };
    const colors = ((_g = product.swatches) === null || _g === void 0 ? void 0 : _g.map((swatch) => ({
        name: swatch.colorName || 'Default',
        code: swatch.colorCode,
        imageUrl: swatch.productImage,
    }))) || [];
    return {
        brand: 'H&M',
        source: 'hm',
        externalId: product.id,
        name: product.productName,
        description: '',
        mainImageUrl: (_j = (_h = product.images) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.url,
        productUrl: detail.productUrl,
        colors,
        detail,
        raw: product,
        queryMeta: {
            key: meta.key,
            query: meta.query,
            min: meta.min.toString(),
            max: meta.max.toString(),
            type: 'hm',
            brand: 'hm',
        },
    };
}
function scrapeRequest(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const exec = (url) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (request.src === 'zara') {
                    const results = yield scrapeZara(url);
                    if (!results.length)
                        return null;
                    return mapZaraProduct(results[0], request.locale, request);
                }
                if (request.src === 'hm') {
                    const results = yield scrapeHM(url);
                    if (!results.length)
                        return null;
                    return mapHMProduct(results[0], request.locale, request);
                }
                return null;
            }
            catch (error) {
                console.error(`Error scraping ${request.src} (${url}):`, error);
                return null;
            }
        });
        const primary = yield exec(request.url);
        if (primary)
            return primary;
        if (request.backup) {
            console.log(`Primary URL failed for ${request.src}. Trying backup...`);
            return yield exec(request.backup);
        }
        return null;
    });
}
export function scrapeSources(requests) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(requests.map(scrapeRequest));
    });
}
