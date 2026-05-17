// api/venues/index.ts
// Tüm venue template'leri listele (debug/admin için)
//
// Kullanım:
//   GET /api/venues
//   GET /api/venues?league=Bundesliga%201
//   → { count, venues: [...] }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import venuesData from '../../seed-data/venues-bundesliga-36.json';

interface VenueTemplate {
  venue_id: string;
  name: string;
  city: string;
  capacity: number;
  league: string;
  team_name: string;
  match_patterns: string[];
  layout: any;
}

const VENUES = venuesData as unknown as VenueTemplate[];

export default function handler(req: VercelRequest, res: VercelResponse) {
  const league = req.query.league as string | undefined;
  const summary = req.query.summary === 'true';
  
  let filtered = VENUES;
  if (league) {
    filtered = VENUES.filter(v => v.league === league);
  }
  
  if (summary) {
    // Sadece özet — boyut küçük
    const minimal = filtered.map(v => ({
      venue_id: v.venue_id,
      name: v.name,
      city: v.city,
      capacity: v.capacity,
      league: v.league,
      team_name: v.team_name,
    }));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json({ count: minimal.length, venues: minimal });
  }
  
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).json({ count: filtered.length, venues: filtered });
}
