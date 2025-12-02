import { NormalizedProduct } from '../types/style';
import { ProductSource } from '../models/product.model';

type Gender = 'male' | 'female' | 'all' | string;

interface SourceRequest {
  src: ProductSource;
  url: string;
  backup?: string;
  locale: string;
  gender: Gender;
  key: string;
  query: string;
  min: number;
  max: number;
  brands: string[];
}

interface ScrapeArgs {
  query: string;
  key: string;
  min: number;
  max: number;
  gender: Gender;
  locale: string;
  brands: string[];
}

interface ZaraProduct {
  id: string;
  locale?: string;
  content: {
    brandImpl?: string;
    name?: string;
    price?: number;
    availability?: string;
    detail?: {
      colors?: {
        id?: string;
        name?: string;
        xmedia?: { url?: string }[];
      }[];
    };
    sectionName?: string;
    familyName?: string;
    reference?: string;
    xmedia?: { url?: string }[];
    seo?: {
      keyword?: string;
      seoProductId?: string;
    };
  };
}

interface HMProduct {
  id: string;
  locale?: string;
  productName?: string;
  prices?: { price?: number; formattedPrice?: string }[];
  availability?: { stockState?: string };
  swatches?: {
    articleId?: string;
    colorName?: string;
    colorCode?: string;
    productImage?: string;
  }[];
  newArrival?: boolean;
  images?: { url?: string }[];
  url?: string;
  percentageDiscount?: string;
}

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
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.zara.com/',
};

export function getSourceRequests(args: ScrapeArgs): SourceRequest[] {
  const { query, key, min, max, gender, locale, brands } = args;
  const normalizedLocale = locale.includes('-')
    ? locale.split('-').map((segment, index, arr) => (index === arr.length - 1 ? segment.toUpperCase() : segment)).join('-')
    : locale.split('_').map((segment, index, arr) => (index === arr.length - 1 ? segment.toUpperCase() : segment)).join('_');

  const normalizedBrands = brands.map((brand) => brand.trim().toLowerCase());

  const sources: SourceRequest[] = [
    {
      src: 'zara',
      url: `https://www.zara.com/itxrest/1/search/store/22701/query?query=${encodeURIComponent(
        query
      )}&locale=en_US&deviceType=desktop&catalogue=79051&warehouse=33551&section=${
        ['male', 'men', 'man'].includes(gender.toLowerCase()) ? 'MAN' : 'WOMAN'
      }&offset=0&limit=1&scope=default&origin=default&ajax=true&filter=priceFilter:0-${Math.max(
        Math.floor(max) * 100,
        20000
      )}`,
      backup: `https://www.zara.com/itxrest/1/search/store/22701/query?query=${encodeURIComponent(
        key
      )}&locale=en_US&deviceType=desktop&catalogue=79051&warehouse=33551&section=${
        ['male', 'men', 'man'].includes(gender.toLowerCase()) ? 'MAN' : 'WOMAN'
      }&offset=0&limit=1&scope=default&origin=default&ajax=true`,
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
      url: `https://api.hm.com/search-services/v1/en_us/search/resultpage?query=${encodeURIComponent(
        query
      )}&rFacets=price:0.000|${max}&touchPoint=desktop&page=1&pageSize=1&sort=RELEVANCE&department=${
        HM_DEPARTMENT[gender.toLowerCase() as keyof typeof HM_DEPARTMENT] || 'all'
      }`,
      backup: `https://api.hm.com/search-services/v1/${locale
        .split('-')
        .join('_')
        .toLowerCase()}/search/resultpage?query=${encodeURIComponent(
        key
      )}&touchPoint=desktop&page=1&pageSize=1&sort=RELEVANCE&department=${
        HM_DEPARTMENT[gender.toLowerCase() as keyof typeof HM_DEPARTMENT] || 'all'
      }`,
      locale: normalizedLocale,
      gender,
      key,
      query,
      min,
      max,
      brands: normalizedBrands,
    },
  ];

  // If no preferred brands are specified, try all supported sources.
  if (normalizedBrands.length === 0) {
    return sources;
  }

  // Prefer user-selected brands but keep others as a fallback so that
  // transient failures (e.g. Zara 400s) don't completely break generation.
  const prioritized = sources.filter((source) => normalizedBrands.includes(source.src));
  const fallback = sources.filter((source) => !normalizedBrands.includes(source.src));

  return prioritized.length ? [...prioritized, ...fallback] : sources;
}

async function scrapeWithFetch(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  return response;
}

async function scrapeWithOxylabs(url: string): Promise<Response> {
  if (!hasOxylabsCredentials) {
    throw new Error('Oxylabs credentials are missing');
  }

  const payload = {
    source: 'universal_ecommerce',
    url,
  };

  const auth = Buffer.from(`${process.env.OXY_UNAME}:${process.env.OXY_PASS}`).toString('base64');

  const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
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

  const data = await response.json();
  return new Response(data.results?.[0]?.content ?? '', { status: 200 });
}

async function scrapeZara(url: string): Promise<ZaraProduct[]> {
  try {
    const res = await scrapeWithFetch(url);
    const json = (await res.json()) as { results?: ZaraProduct[] };
    return json.results || [];
  } catch (error) {
    console.warn('Zara fetch failed, trying Oxylabs...', error);
    if (!hasOxylabsCredentials) throw error;
    const res = await scrapeWithOxylabs(url);
    const json = (await res.json()) as { results?: ZaraProduct[] };
    return json.results || [];
  }
}

async function scrapeHM(url: string): Promise<HMProduct[]> {
  try {
    const res = await scrapeWithFetch(url, { 'x-client-id': 'style-up-generator' });
    const json = (await res.json()) as { searchHits?: { productList?: HMProduct[] } };
    return json.searchHits?.productList || [];
  } catch (error) {
    console.warn('HM fetch failed, trying Oxylabs...', error);
    if (!hasOxylabsCredentials) throw error;
    const res = await scrapeWithOxylabs(url);
    const json = (await res.json()) as { searchHits?: { productList?: HMProduct[] } };
    return json.searchHits?.productList || [];
  }
}

function mapZaraProduct(product: ZaraProduct, locale: string, meta: SourceRequest): NormalizedProduct | null {
  if (!product?.id || !product.content?.name) {
    return null;
  }

  const seoKeyword = product.content.seo?.keyword || product.content.name?.toLowerCase().replace(/\s+/g, '-');
  const seoId = product.content.seo?.seoProductId || product.id;

  const detail = {
    locale: locale.toLowerCase(),
    currency: 'USD',
    price: product.content.price ?? undefined,
    productUrl: `https://www.zara.com/us/en/${seoKeyword}-p${seoId}.html`,
    availability: product.content.availability,
  };

  const colors =
    product.content.detail?.colors?.map((color) => ({
      name: color?.name || 'Default',
      code: color?.id,
      imageUrl: color?.xmedia?.[0]?.url,
    })) || [];

  return {
    brand: 'Zara',
    source: 'zara',
    externalId: product.id,
    name: product.content.name,
    description: `${product.content.sectionName || ''} ${product.content.familyName || ''}`.trim(),
    mainImageUrl: product.content.xmedia?.[0]?.url,
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

function mapHMProduct(product: HMProduct, locale: string, meta: SourceRequest): NormalizedProduct | null {
  if (!product?.id || !product.productName) {
    return null;
  }

  const primaryPrice = product.prices?.[0];
  const currency =
    primaryPrice?.formattedPrice?.match(/^[A-Za-z$€£¥₺₩₱]+/)?.[0] ||
    primaryPrice?.formattedPrice?.split(/\s+/)?.[0] ||
    'USD';

  const detail = {
    locale: locale.toLowerCase(),
    currency,
    price: primaryPrice?.price,
    productUrl: product.url ? `https://www2.hm.com${product.url}` : undefined,
    availability: product.availability?.stockState,
  };

  const colors =
    product.swatches?.map((swatch) => ({
      name: swatch.colorName || 'Default',
      code: swatch.colorCode,
      imageUrl: swatch.productImage,
    })) || [];

  return {
    brand: 'H&M',
    source: 'hm',
    externalId: product.id,
    name: product.productName,
    description: '',
    mainImageUrl: product.images?.[0]?.url,
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

async function scrapeRequest(request: SourceRequest): Promise<NormalizedProduct | null> {
  const exec = async (url: string): Promise<NormalizedProduct | null> => {
    try {
      if (request.src === 'zara') {
        const results = await scrapeZara(url);
        if (!results.length) return null;
        return mapZaraProduct(results[0], request.locale, request);
      }

      if (request.src === 'hm') {
        const results = await scrapeHM(url);
        if (!results.length) return null;
        return mapHMProduct(results[0], request.locale, request);
      }

      return null;
    } catch (error) {
      console.error(`Error scraping ${request.src} (${url}):`, error);
      return null;
    }
  };

  const primary = await exec(request.url);
  if (primary) return primary;

  if (request.backup) {
    console.log(`Primary URL failed for ${request.src}. Trying backup...`);
    return await exec(request.backup);
  }

  return null;
}

export async function scrapeSources(requests: SourceRequest[]): Promise<(NormalizedProduct | null)[]> {
  return Promise.all(requests.map(scrapeRequest));
}

export type { SourceRequest, ScrapeArgs };

