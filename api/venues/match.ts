// api/venues/match.ts
// Mekan adıyla template eşleştir
//
// Kullanım:
//   GET /api/venues/match?name=Allianz%20Arena
//   → { matched: true, venue_id, layout, ... }
//   GET /api/venues/match?name=Unknown%20Venue
//   → { matched: false }

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
  const name = req.query.name as string;
  if (!name) {
    return res.status(400).json({ error: 'name query param required' });
  }
  
  const normalized = name.toLowerCase().trim();
  let best: { template: VenueTemplate; matchLen: number } | null = null;
  
  for (const t of VENUES) {
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
  
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  if (!best) {
    return res.status(200).json({ matched: false, query: name });
  }
  
  return res.status(200).json({
    matched: true,
    query: name,
    confidence: best.matchLen / normalized.length,
    ...best.template,
  });
}
