// api/discover/run.ts
// Manuel discovery tetikleyici - GET ile test edilir, ufak parametreler
// Auth-less değil, query'de ?secret=XXX ile korunur
//
// Kullanım:
//   curl 'https://YOUR_VERCEL_URL/api/discover/run?secret=XXX&city=Berlin&pages=1'

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncGermanEvents } from '../lib/discoveryCore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.MANUAL_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'No secret configured' });
  }
  if (req.query.secret !== secret) {
    return res.status(401).json({ error: 'Wrong secret' });
  }

  const tmKey = process.env.TICKETMASTER_API_KEY;
  if (!tmKey) {
    return res.status(500).json({ error: 'TICKETMASTER_API_KEY not set' });
  }

  const city = req.query.city as string | undefined;
  const genre = req.query.genre as string | undefined;
  const pages = parseInt(req.query.pages as string ?? '1', 10);

  try {
    const stats = await syncGermanEvents(tmKey, {
      cities: city ? [city] : ['Berlin'], // default: küçük scope test
      genres: genre ? [genre] : ['Music'],
      maxPagesPerQuery: Math.min(pages, 5),
      onlyAvailable: true,
    });
    return res.status(200).json({ success: true, ...stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
