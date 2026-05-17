// api/cron/discover.ts
// Vercel Cron Job — her gün 06:00 UTC çalışır
// Almanya etkinliklerini Ticketmaster'dan çekip Base44'e yazar
//
// Vercel cron tetiklemek için:
//   vercel.json içinde "crons": [{ "path": "/api/cron/discover", "schedule": "0 6 * * *" }]
//
// Manuel test için:
//   curl -X POST https://YOUR_VERCEL_URL/api/cron/discover -H "Authorization: Bearer CRON_SECRET"

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncGermanEvents } from '../lib/discoveryCore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron secret kontrolü (Vercel cron header otomatik gönderir)
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  
  if (cronSecret) {
    const expected = `Bearer ${cronSecret}`;
    if (auth !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const tmKey = process.env.TICKETMASTER_API_KEY;
  if (!tmKey) {
    return res.status(500).json({ error: 'TICKETMASTER_API_KEY not set' });
  }

  // Body'den özel ayar gelirse (manuel test için)
  const cities = req.body?.cities;
  const genres = req.body?.genres;
  const maxPages = req.body?.maxPages ?? 2;

  console.log('[cron/discover] starting...', { cities, genres, maxPages });
  const startTime = Date.now();
  
  try {
    const stats = await syncGermanEvents(tmKey, {
      cities,
      genres,
      maxPagesPerQuery: maxPages,
      onlyAvailable: true,
    });
    
    const duration = Date.now() - startTime;
    console.log('[cron/discover] done', { ...stats, durationMs: duration });
    
    return res.status(200).json({
      success: true,
      durationMs: duration,
      ...stats,
    });
  } catch (err: any) {
    console.error('[cron/discover] failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
