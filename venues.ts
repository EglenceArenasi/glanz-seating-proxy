// api/seed/venues.ts
// Bundesliga 1 + 2 Venue Seed Importer
// 
// 36 stadyumu (18 Bundesliga 1 + 18 Bundesliga 2) Base44'e yükler.
// Idempotent: venue_id'ye göre upsert. Tekrar çağrılırsa update eder.
//
// Kullanım:
//   curl -X POST 'https://YOUR_VERCEL_URL/api/seed/venues?secret=XXX'

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { upsertByExternalId } from '../lib/base44';
import venuesData from '../../seed-data/venues-bundesliga-36.json';

interface VenueRecord {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.MANUAL_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Wrong secret' });
  }

  const venues = venuesData as VenueRecord[];
  const results = {
    total: venues.length,
    bundesliga_1: 0,
    bundesliga_2: 0,
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const venue of venues) {
    try {
      const { created } = await upsertByExternalId<VenueRecord>(
        'venue_seating_templates',
        'venue_id',
        venue.venue_id,
        {
          ...venue,
          last_updated: new Date().toISOString(),
        } as Partial<VenueRecord>
      );
      if (created) results.created++;
      else results.updated++;
      
      if (venue.league === 'Bundesliga 1') results.bundesliga_1++;
      if (venue.league === 'Bundesliga 2') results.bundesliga_2++;
    } catch (err: any) {
      results.errors.push(`${venue.venue_id}: ${err.message}`.slice(0, 200));
    }
    await new Promise(r => setTimeout(r, 150));
  }

  return res.status(200).json({ success: true, ...results });
}
