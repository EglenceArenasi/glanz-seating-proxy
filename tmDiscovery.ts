// api/lib/tmDiscovery.ts
// Ticketmaster Discovery API client — Almanya etkinlikleri
//
// Resmi API: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
// Auth: API key (query param)
// Rate limit: 5000 req/gün, 5 req/sn

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2';

export interface TMVenue {
  id: string;
  name: string;
  city?: { name: string };
  country?: { name: string; countryCode: string };
  postalCode?: string;
  location?: { latitude: string; longitude: string };
  address?: { line1?: string };
}

export interface TMAttraction {
  id: string;
  name: string;
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
  }>;
  images?: Array<{ url: string; width: number; height: number; ratio?: string }>;
  externalLinks?: {
    spotify?: Array<{ url: string }>;
    instagram?: Array<{ url: string }>;
    facebook?: Array<{ url: string }>;
  };
}

export interface TMEvent {
  id: string;
  name: string;
  url: string;
  images?: Array<{ url: string; width: number; height: number; ratio?: string }>;
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
    status?: { code: string };
  };
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  seatmap?: { staticUrl?: string };
  info?: string;
  pleaseNote?: string;
  _embedded?: {
    venues?: TMVenue[];
    attractions?: TMAttraction[];
  };
}

export interface DiscoveryParams {
  countryCode?: string;     // "DE"
  city?: string;            // "Berlin"
  classificationName?: string; // "Music", "Sports", "Arts & Theatre"
  startDateTime?: string;   // ISO
  endDateTime?: string;     // ISO
  size?: number;            // max 200
  page?: number;
  sort?: 'date,asc' | 'date,desc' | 'relevance,desc';
}

/**
 * Almanya'daki etkinlikleri çek.
 * Çağrı başına max 200 event, pagination ile devam ettir.
 */
export async function discoverEvents(
  apiKey: string,
  params: DiscoveryParams = {}
): Promise<{ events: TMEvent[]; totalElements: number; totalPages: number }> {
  const url = new URL(`${TM_BASE}/events.json`);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('countryCode', params.countryCode ?? 'DE');
  url.searchParams.set('size', String(params.size ?? 100));
  url.searchParams.set('page', String(params.page ?? 0));
  url.searchParams.set('sort', params.sort ?? 'date,asc');
  
  if (params.city) url.searchParams.set('city', params.city);
  if (params.classificationName) url.searchParams.set('classificationName', params.classificationName);
  if (params.startDateTime) url.searchParams.set('startDateTime', params.startDateTime);
  if (params.endDateTime) url.searchParams.set('endDateTime', params.endDateTime);
  
  // Sadece gelecekteki etkinlikleri istiyoruz
  if (!params.startDateTime) {
    url.searchParams.set('startDateTime', new Date().toISOString().split('.')[0] + 'Z');
  }

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`TM Discovery ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const data = await res.json();
  return {
    events: data._embedded?.events ?? [],
    totalElements: data.page?.totalElements ?? 0,
    totalPages: data.page?.totalPages ?? 0,
  };
}

/**
 * En iyi image'i bul (büyük + 16:9 oran tercih)
 */
export function pickBestImage(images?: TMEvent['images']): string | null {
  if (!images || images.length === 0) return null;
  // 16:9 oran + en geniş
  const sixteenNine = images.filter(i => i.ratio === '16_9').sort((a, b) => b.width - a.width);
  if (sixteenNine.length > 0) return sixteenNine[0].url;
  // Fallback: en geniş
  return images.sort((a, b) => b.width - a.width)[0].url;
}

/**
 * Etkinlik durumu — bilet satışta mı?
 */
export function isEventAvailable(event: TMEvent): boolean {
  const status = event.dates?.status?.code;
  return status === 'onsale' || status === 'rescheduled';
}

/**
 * Etkinlik ana sanatçısı
 */
export function pickMainArtist(event: TMEvent): TMAttraction | undefined {
  return event._embedded?.attractions?.[0];
}

/**
 * Etkinlik mekanı
 */
export function pickVenue(event: TMEvent): TMVenue | undefined {
  return event._embedded?.venues?.[0];
}
