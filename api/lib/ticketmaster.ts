// api/lib/ticketmaster.ts
// Ticketmaster Discovery API adapter
// Resmi API, API key gerektirir (ücretsiz 5000 req/gün)
//
// Endpoint:
//   GET app.ticketmaster.com/discovery/v2/events/{id}.json?apikey=XXX
//
// Türkiye için Biletix Live Nation grubunda olduğundan TM API'sinden
// bazı etkinlikler erişilebilir.

import type { SeatingResult, SeatingBlock, SeatingCategory } from './types';

interface TMEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string };
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  seatmap?: { staticUrl?: string };
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { name: string; countryCode: string };
      location?: { latitude: string; longitude: string };
    }>;
    attractions?: Array<{ name: string }>;
  };
}

export async function fetchTicketmasterSeating(
  url: string,
  apiKey?: string
): Promise<SeatingResult | null> {
  if (!apiKey) {
    console.warn('[tm] no API key');
    return null;
  }

  const eventId = extractEventId(url);
  if (!eventId) return null;

  const apiUrl =
    `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${apiKey}`;
  const res = await fetch(apiUrl);
  if (!res.ok) {
    console.warn(`[tm] ${res.status}`, await res.text().catch(() => ''));
    return null;
  }

  const event: TMEvent = await res.json();
  return mapEventToSeating(event);
}

function extractEventId(url: string): string | null {
  // TM URL örnekleri:
  //   https://www.ticketmaster.com/event/Z698xZC2Z17V8E0
  //   https://www.ticketmaster.de/event/.../event-id/
  try {
    const u = new URL(url);
    // URL'in son segmentinde event ID (alfanumerik)
    const segments = u.pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      // TM event ID format: harf+rakam karışık, 8-20 karakter
      if (/^[A-Z0-9]{8,20}$/i.test(seg)) return seg;
    }
    return null;
  } catch {
    return null;
  }
}

function mapEventToSeating(event: TMEvent): SeatingResult {
  const venue = event._embedded?.venues?.[0];
  const loc = venue?.location;

  const blocks: SeatingBlock[] = (event.priceRanges ?? []).map((pr, idx) => {
    const label = pr.type || `Kategorie ${idx + 1}`;
    return {
      id: `tm-${idx}`,
      label,
      category: label,
      hasRows: true,
      hasSeatNumbers: true,
      priceRange: { min: pr.min, max: pr.max, currency: pr.currency },
    };
  });

  const categories: SeatingCategory[] =
    blocks.length > 0
      ? [{ id: 'all', label: 'Kategorien', blocks }]
      : [];

  return {
    mode: blocks.length > 0 ? 'numbered' : 'unknown',
    platform: 'ticketmaster',
    source: 'live',
    event: {
      title: event.name,
      date: event.dates?.start?.dateTime ?? event.dates?.start?.localDate,
      artists: event._embedded?.attractions?.map((a) => a.name),
    },
    venue: {
      name: venue?.name,
      city: venue?.city?.name,
      country: venue?.country?.name,
      lat: loc ? parseFloat(loc.latitude) : undefined,
      lng: loc ? parseFloat(loc.longitude) : undefined,
    },
    categories,
  };
}