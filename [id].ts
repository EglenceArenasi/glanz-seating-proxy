// api/venues/[id].ts
// Tek venue template lookup (mobile app için)
//
// Kullanım:
//   GET /api/venues/allianz-arena-munchen
//   → { venue_id, name, city, capacity, layout, ... }
//
// Mobile app, Base44 Event'tan venue_map_url field'ını alır,
// onu bu endpoint'e çevirir, krokisini render eder.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import venuesData from '../../seed-data/venues-bundesliga-36.json';

interface VenueTemplate {
  venue_id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  type: string;
  sport: string;
  league: string;
  team_id: string;
  team_name: string;
  lat: number;
  lng: number;
  match_patterns: string[];
  layout: any;
  source: string;
}

const VENUES = venuesData as unknown as VenueTemplate[];

export default function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'venue id required' });
  }
  
  const venue = VENUES.find(v => v.venue_id === id);
  if (!venue) {
    return res.status(404).json({ error: 'venue not found', id });
  }
  
  // 24 saat cache
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.status(200).json(venue);
}
