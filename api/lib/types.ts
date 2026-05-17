// api/lib/types.ts
// Tüm adapter'lar bu formatta veri döner

export interface SeatingBlock {
  id: string;
  label: string;
  category?: string;       // "Stehplatz", "Kategorie 1", "VIP", etc.
  priceRange?: { min: number; max: number; currency: string };
  hasRows: boolean;
  hasSeatNumbers: boolean;
}

export interface SeatingCategory {
  id: string;
  label: string;
  blocks: SeatingBlock[];
}

export interface VenueInfo {
  name?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface EventInfo {
  title?: string;
  date?: string;        // ISO
  artists?: string[];
}

export interface SeatingResult {
  mode: 'numbered' | 'unnumbered' | 'mixed' | 'unknown';
  platform: 'eventim' | 'ticketmaster' | 'biletix' | 'eventbrite' | 'unknown';
  event?: EventInfo;
  venue?: VenueInfo;
  categories: SeatingCategory[];
  source: 'live';
}

export type Platform = SeatingResult['platform'];

export function detectPlatform(url: string): Platform {
  // Eventim ailesi (23+ ülke domain'i)
  if (/eventim\.(de|com|at|ch|it|fr|es|nl|be|pl|cz|sk|hu|dk|fi|no|se|ie|pt|ro)/i.test(url))
    return 'eventim';
  if (/oeticket\.com/i.test(url)) return 'eventim';      // Avusturya alt-markası
  if (/ticketcorner\.ch/i.test(url)) return 'eventim';   // İsviçre alt-markası
  if (/ticketone\.it/i.test(url)) return 'eventim';      // İtalya alt-markası
  
  // Ticketmaster ailesi (Live Nation)
  if (/ticketmaster\.(com|com\.tr|de|co\.uk|fr|es|it|nl|be|at|ch|ie|dk|fi|no|se)/i.test(url))
    return 'ticketmaster';
  if (/biletix\.com/i.test(url)) return 'biletix';       // Türkiye - özel adapter

  // Eventbrite
  if (/eventbrite\.(com|de|co\.uk|fr|es|it|nl|au|ca)/i.test(url))
    return 'eventbrite';

  return 'unknown';
}