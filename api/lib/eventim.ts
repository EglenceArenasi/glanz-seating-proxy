// api/lib/eventim.ts
// CTS Eventim adapter — Avrupa'nın #1 ticketing platformu (23+ ülke)
//
// Strateji:
// 1. URL'den productId çıkar (URL pattern: /event/<slug>-<productId>/)
// 2. Public search API'sini productId ile sorgula → meta data + categories
// 3. Categories listesi → block listesi olarak format'la
//
// Resmi olmayan ama public API. pyventim ile keşfedilmiş, stabilize edilmiş.
// Endpoints:
//   GET public-api.eventim.com/websearch/search/api/exploration/v1/products

import type { SeatingResult, SeatingBlock, SeatingCategory } from './types';

const PUBLIC_API_BASE = 'https://public-api.eventim.com/websearch/search/api/exploration/v1';

// Domain → webId mapping (Eventim'in alt-domain'leri farklı webId'ler kullanıyor)
const DOMAIN_TO_WEBID: Record<string, { webId: string; language: string }> = {
  'eventim.de': { webId: 'web__eventim-de', language: 'de' },
  'eventim.at': { webId: 'web__eventim-at', language: 'de' },
  'eventim.ch': { webId: 'web__eventim-ch', language: 'de' },
  'eventim.it': { webId: 'web__eventim-it', language: 'it' },
  'eventim.fr': { webId: 'web__eventim-fr', language: 'fr' },
  'eventim.es': { webId: 'web__eventim-es', language: 'es' },
  'eventim.nl': { webId: 'web__eventim-nl', language: 'nl' },
  'eventim.com': { webId: 'web__eventim-de', language: 'en' }, // default
  'oeticket.com': { webId: 'web__oeticket', language: 'de' },
};

interface EventimProduct {
  productId: string;
  productGroupId?: string;
  name: string;
  type: string;
  status: string;
  inStock?: boolean;
  link?: string;
  typeAttributes?: {
    liveEntertainment?: {
      startDate?: string;
      location?: {
        name?: string;
        city?: string;
        countryName?: string;
        geoLocation?: { latitude: number; longitude: number };
      };
    };
  };
  attractions?: Array<{ name: string }>;
  categories?: Array<{ name: string; parentCategory?: { name: string } }>;
  price?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  priceCategories?: Array<{
    name?: string;
    price?: { value: number; currency: string };
    minPrice?: number;
    maxPrice?: number;
  }>;
}

export async function fetchEventimSeating(url: string): Promise<SeatingResult | null> {
  const productId = extractProductId(url);
  if (!productId) {
    console.warn('[eventim] productId not found in URL', url);
    return null;
  }

  const { webId, language } = getApiConfigForUrl(url);

  // Public search API ile productId'yi sorgula
  const apiUrl =
    `${PUBLIC_API_BASE}/products?` +
    new URLSearchParams({
      webId,
      language,
      retail_partner: 'EVE',
      ids: productId,
      top: '1',
    });

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': `${language},en;q=0.5`,
    },
  });

  if (!res.ok) {
    console.warn(`[eventim] API ${res.status}`, await res.text().catch(() => ''));
    return null;
  }

  const data = await res.json();
  const product: EventimProduct | undefined = data?.products?.[0];
  if (!product) return null;

  return mapProductToSeating(product);
}

function extractProductId(url: string): string | null {
  // Eventim URL pattern örnekleri:
  //   https://www.eventim.de/event/foo-bar-17352258/
  //   https://www.eventim.de/event/disneys-der-koenig-der-loewen-stage-theater-im-hafen-hamburg-18500464/
  //   https://www.eventim.de/event/17352258
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    // Sondaki sayısal kısım productId
    const match = path.match(/(\d{6,})\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function getApiConfigForUrl(url: string): { webId: string; language: string } {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    for (const [domain, cfg] of Object.entries(DOMAIN_TO_WEBID)) {
      if (hostname.endsWith(domain)) return cfg;
    }
  } catch {}
  return { webId: 'web__eventim-de', language: 'de' };
}

function mapProductToSeating(p: EventimProduct): SeatingResult {
  const venueInfo = p.typeAttributes?.liveEntertainment?.location;
  const loc = venueInfo?.geoLocation;

  // Price categories → blocks
  const blocks: SeatingBlock[] = (p.priceCategories ?? []).map((pc, idx) => {
    const label = pc.name?.trim() || `Kategorie ${idx + 1}`;
    const isUnnumbered = /stehplatz|standing|allgemein|general/i.test(label);
    const min = pc.minPrice ?? pc.price?.value;
    const max = pc.maxPrice ?? pc.price?.value;
    const currency = pc.price?.currency ?? p.price?.currency ?? 'EUR';
    return {
      id: slugify(label),
      label,
      category: label,
      hasRows: !isUnnumbered,
      hasSeatNumbers: !isUnnumbered,
      priceRange:
        min !== undefined && max !== undefined
          ? { min, max, currency }
          : undefined,
    };
  });

  // Eğer priceCategories yoksa, single block as fallback
  const categories: SeatingCategory[] =
    blocks.length > 0
      ? [{ id: 'all', label: 'Kategorien', blocks }]
      : p.price?.min !== undefined
        ? [
            {
              id: 'all',
              label: 'Kategorien',
              blocks: [
                {
                  id: 'default',
                  label: 'Standard',
                  hasRows: true,
                  hasSeatNumbers: true,
                  priceRange: {
                    min: p.price.min,
                    max: p.price.max ?? p.price.min,
                    currency: p.price.currency ?? 'EUR',
                  },
                },
              ],
            },
          ]
        : [];

  // Mode tespiti
  const hasNumbered = blocks.some((b) => b.hasRows);
  const hasUnnumbered = blocks.some((b) => !b.hasRows);
  const mode: SeatingResult['mode'] =
    hasNumbered && hasUnnumbered
      ? 'mixed'
      : hasNumbered
        ? 'numbered'
        : hasUnnumbered
          ? 'unnumbered'
          : 'unknown';

  return {
    mode,
    platform: 'eventim',
    source: 'live',
    event: {
      title: p.name,
      date: p.typeAttributes?.liveEntertainment?.startDate,
      artists: p.attractions?.map((a) => a.name),
    },
    venue: {
      name: venueInfo?.name,
      city: venueInfo?.city,
      country: venueInfo?.countryName,
      lat: loc?.latitude,
      lng: loc?.longitude,
    },
    categories,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}