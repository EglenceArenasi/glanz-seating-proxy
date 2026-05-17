// api/lib/discoveryCore.ts
// AI Discovery Agent — Final, Base44 gerçek şemasına uyumlu
//
// HEDEF Base44 collections:
//   - Event (mevcut, 16 field)
//   - Ticket (mevcut, 15 field) — kullanıcı manuel input için
//   - EventAttendee (mevcut, 5 field) — RSVP
//   - Choreography (mevcut, 14 field) — ışık şovu
//
// VENUE TEMPLATE: Vercel filesystem (venues-bundesliga-36.json)
// Base44'e gitmiyor, Vercel API endpoint'i üzerinden mobile app'e sunulur.

import {
  discoverEvents,
  pickBestImage,
  pickMainArtist,
  pickVenue,
  isEventAvailable,
  type TMEvent,
} from './tmDiscovery';
import { upsertByExternalId } from './base44';

// venues-bundesliga-36.json import (Vercel build sırasında bundle'a girer)
import venuesData from '../../seed-data/venues-bundesliga-36.json';

// ============================================================================
// GLANZ EVENT SCHEMA (Base44 Event collection alanları + ek meta için pattern_data benzeri)
// ============================================================================

export interface GlanzEvent {
  id?: string;
  // Base44 'Event' field'larına bire bir uyumlu
  title: string;
  description?: string;
  type: 'concert' | 'match' | 'festival' | 'other';
  date: string;                          // ISO datetime
  doors_open?: string;
  venue_name: string;
  city: string;
  country?: string;
  image_url?: string;
  artist_team?: string;                  // sanatçı veya takım adı
  category: 'music' | 'sports' | 'esports' | 'theater' | 'comedy';
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  capacity?: number;
  attendee_count?: number;
  venue_map_url?: string;                // Vercel kroki API endpoint URL
  is_featured?: boolean;
  
  // Custom field — external dedup için (Base44 schema'da olmasa da Base44 ekstra field tolere eder)
  external_id?: string;
}

// ============================================================================
// LOCAL VENUE MATCHING (Vercel filesystem, Base44'e gitmiyor)
// ============================================================================

interface VenueTemplate {
  venue_id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  match_patterns: string[];
  team_id?: string;
  team_name?: string;
  sport?: string;
  league?: string;
  layout: any;
}

const VENUE_TEMPLATES = venuesData as unknown as VenueTemplate[];

function matchVenueName(tmVenueName: string): VenueTemplate | null {
  const normalized = tmVenueName.toLowerCase().trim();
  let best: { template: VenueTemplate; matchLen: number } | null = null;
  
  for (const t of VENUE_TEMPLATES) {
    for (const pattern of t.match_patterns ?? []) {
      const p = pattern.toLowerCase().trim();
      if (normalized === p || normalized.includes(p) || p.includes(normalized)) {
        const matchLen = Math.min(p.length, normalized.length);
        if (!best || matchLen > best.matchLen) {
          best = { template: t, matchLen };
        }
      }
    }
  }
  
  return best?.template ?? null;
}

// ============================================================================
// CATEGORY/TYPE MAPPING (TM Discovery → Base44 enum'lar)
// ============================================================================

function mapToBase44Category(tmSegment: string): GlanzEvent['category'] {
  const s = tmSegment.toLowerCase();
  if (s === 'sports') return 'sports';
  if (s === 'music') return 'music';
  if (s.includes('theatre') || s.includes('arts')) return 'theater';
  if (s.includes('comedy')) return 'comedy';
  return 'music'; // default fallback
}

function mapToBase44Type(tmSegment: string, hasMatchedFootballVenue: boolean): GlanzEvent['type'] {
  if (hasMatchedFootballVenue) return 'match';
  const s = tmSegment.toLowerCase();
  if (s === 'sports') return 'match';
  if (s.includes('festival')) return 'festival';
  if (s === 'music') return 'concert';
  return 'other';
}

function mapToBase44Status(tmStatusCode: string): GlanzEvent['status'] {
  switch (tmStatusCode) {
    case 'onsale': return 'upcoming';
    case 'offsale': return 'upcoming';      // satış kapalı ama etkinlik yakında — upcoming
    case 'rescheduled': return 'upcoming';
    case 'cancelled': return 'cancelled';
    default: return 'upcoming';
  }
}

// ============================================================================
// TRANSFORM
// ============================================================================

function transformTMEvent(event: TMEvent): GlanzEvent | null {
  const venue = pickVenue(event);
  const artist = pickMainArtist(event);
  if (!venue || !event.dates?.start?.localDate) return null;

  const dateIso = event.dates.start.dateTime ??
    `${event.dates.start.localDate}T${event.dates.start.localTime ?? '20:00:00'}`;

  const segment = event.classifications?.[0]?.segment?.name ?? '';
  
  // 🎯 Venue match — bu spor mu, biliyor muyuz?
  const matched = matchVenueName(venue.name);
  const isFootballMatch = !!matched?.sport && matched.sport === 'football';
  
  // venue_map_url: Vercel'deki venue lookup endpoint
  // Mobile app burayı çağırınca template JSON'ı döner
  const venueMapUrl = matched 
    ? `https://glanz-seating-proxy.vercel.app/api/venues/${matched.venue_id}`
    : undefined;
  
  // artist_team: spor için takım adı, müzik için sanatçı
  let artistTeam: string | undefined;
  if (isFootballMatch && matched?.team_name) {
    artistTeam = matched.team_name;
  } else if (artist?.name) {
    artistTeam = artist.name;
  }

  return {
    external_id: `tm:${event.id}`,
    title: event.name,
    description: event.info,
    type: mapToBase44Type(segment, isFootballMatch),
    date: dateIso,
    venue_name: venue.name,
    city: venue.city?.name ?? '',
    country: venue.country?.countryCode ?? 'DE',
    image_url: pickBestImage(event.images) ?? undefined,
    artist_team: artistTeam,
    category: mapToBase44Category(segment),
    status: mapToBase44Status(event.dates.status?.code ?? 'onsale'),
    capacity: matched?.capacity,
    attendee_count: 0,
    venue_map_url: venueMapUrl,
    is_featured: isFootballMatch, // Bundesliga maçları başlangıçta featured!
  };
}

// ============================================================================
// SYNC
// ============================================================================

export interface SyncStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  matched_venues: number;
  football_matches: number;
  errorDetails: string[];
}

const BUNDESLIGA_CITIES = [
  // Bundesliga 1
  'München', 'Dortmund', 'Leipzig', 'Leverkusen', 'Frankfurt', 'Stuttgart',
  'Sinsheim', 'Wolfsburg', 'Mönchengladbach', 'Köln', 'Mainz', 'Augsburg',
  'Heidenheim', 'Bremen', 'Berlin', 'Freiburg', 'Hamburg',
  // Bundesliga 2 ek şehirler
  'Bielefeld', 'Bochum', 'Braunschweig', 'Darmstadt', 'Dresden',
  'Düsseldorf', 'Fürth', 'Hannover', 'Kaiserslautern', 'Karlsruhe',
  'Kiel', 'Magdeburg', 'Münster', 'Nürnberg', 'Paderborn', 'Gelsenkirchen',
];

export async function syncGermanEvents(
  apiKey: string,
  options: {
    cities?: string[];
    genres?: string[];
    maxPagesPerQuery?: number;
    onlyAvailable?: boolean;
  } = {}
): Promise<SyncStats> {
  const stats: SyncStats = {
    fetched: 0, created: 0, updated: 0, skipped: 0, errors: 0,
    matched_venues: 0, football_matches: 0, errorDetails: [],
  };

  console.log(`[discovery] ${VENUE_TEMPLATES.length} venue template loaded from filesystem`);

  const cities = options.cities ?? BUNDESLIGA_CITIES;
  // Önce Sports — Bundesliga maçları öncelikli
  const genres = options.genres ?? ['Sports', 'Music', 'Arts & Theatre'];
  const maxPages = options.maxPagesPerQuery ?? 2;

  for (const city of cities) {
    for (const genre of genres) {
      for (let page = 0; page < maxPages; page++) {
        try {
          const { events, totalPages } = await discoverEvents(apiKey, {
            countryCode: 'DE',
            city,
            classificationName: genre,
            size: 100,
            page,
          });
          
          if (events.length === 0) break;
          stats.fetched += events.length;

          for (const event of events) {
            if (options.onlyAvailable && !isEventAvailable(event)) {
              stats.skipped++;
              continue;
            }
            try {
              const normalized = transformTMEvent(event);
              if (!normalized) { stats.skipped++; continue; }
              
              if (normalized.venue_map_url) stats.matched_venues++;
              if (normalized.type === 'match') stats.football_matches++;
              
              const { created } = await upsertByExternalId<GlanzEvent>(
                'Event',                          // ⭐ Base44 collection adı
                'external_id',
                normalized.external_id!,
                normalized
              );
              if (created) stats.created++;
              else stats.updated++;
            } catch (err: any) {
              stats.errors++;
              stats.errorDetails.push(`${event.id}: ${err.message}`.slice(0, 200));
            }
          }

          if (page + 1 >= totalPages) break;
        } catch (err: any) {
          stats.errors++;
          stats.errorDetails.push(`${city}/${genre}/p${page}: ${err.message}`.slice(0, 200));
          break;
        }

        await new Promise(r => setTimeout(r, 250));
      }
    }
  }

  return stats;
}
