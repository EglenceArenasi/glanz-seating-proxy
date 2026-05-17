// api/seating.ts
// Glanz Light Seating Proxy — Ana router
//
// Tek endpoint, çok platform desteği.
// Mobile app çağırır: POST /api/seating { url: "https://..." }
//
// URL'i analiz et → ilgili adapter'ı çağır → ortak SeatingResult formatında dön

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SeatingResult } from './lib/types';
import { detectPlatform } from './lib/types';
import { fetchEventimSeating } from './lib/eventim';
import { fetchTicketmasterSeating } from './lib/ticketmaster';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS — mobile app her yerden çağırabilsin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = (req.body?.url ?? '').toString().trim();
  if (!url) return res.status(400).json({ error: 'url required in body' });

  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    return res.status(404).json({
      error: 'Unsupported platform',
      hint: 'Supported: eventim.*, ticketmaster.*, biletix.com, eventbrite.*',
      url,
    });
  }

  try {
    let result: SeatingResult | null = null;

    switch (platform) {
      case 'eventim':
        result = await fetchEventimSeating(url);
        break;
      case 'ticketmaster':
        result = await fetchTicketmasterSeating(url, process.env.TICKETMASTER_API_KEY);
        break;
      case 'biletix':
        // Biletix için (Türkiye) ileride: HTML scrape + manuel venue seed
        return res.status(501).json({
          error: 'Biletix not implemented yet',
          platform,
          fallback: 'Use manual venue database for Turkey',
        });
      case 'eventbrite':
        return res.status(501).json({
          error: 'Eventbrite not implemented yet',
          platform,
        });
    }

    if (!result || result.categories.length === 0) {
      return res.status(404).json({
        error: 'No seating info available',
        platform,
        url,
      });
    }

    // Başarı: 5 dakika cache (aynı URL tekrar sorgulanırsa)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[seating] error:', err);
    return res.status(500).json({
      error: err.message || 'parse failed',
      platform,
    });
  }
}