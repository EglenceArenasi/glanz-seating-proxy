// api/seating.ts
// Vercel serverless function — Biletix/Passo URL'inden seating bilgisi çeker
// Mobile app çağırır: POST https://glanz-seating-proxy.vercel.app/api/seating

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

interface SeatingBlock {
  id: string;
  label: string;
  hasRows: boolean;
  hasSeatNumbers: boolean;
}

interface SeatingCategory {
  id: string;
  label: string;
  blocks: SeatingBlock[];
}

interface SeatingResult {
  mode: 'numbered' | 'unnumbered' | 'mixed' | 'unknown';
  venueName?: string;
  categories: SeatingCategory[];
  platform: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS — mobile app her yerden çağırabilsin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url required in body' });
  }

  try {
    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      return res.status(404).json({ error: 'Unknown ticket platform', platform });
    }

    const result = await parseSeating(url, platform);
    if (!result) {
      return res.status(404).json({ error: 'No seating info found', platform });
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[seating] error:', err);
    return res.status(500).json({ error: err.message || 'parse failed' });
  }
}

// ---- Platform tespiti ----
function detectPlatform(url: string): 'biletix' | 'passo' | 'bubilet' | 'unknown' {
  if (/biletix\.com/i.test(url)) return 'biletix';
  if (/passo\.com\.tr/i.test(url)) return 'passo';
  if (/bubilet\.com\.tr/i.test(url)) return 'bubilet';
  return 'unknown';
}

// ---- Ana parser dispatcher ----
async function parseSeating(
  url: string,
  platform: 'biletix' | 'passo' | 'bubilet'
): Promise<SeatingResult | null> {
  const html = await fetchAsBrowser(url);
  const $ = cheerio.load(html);

  switch (platform) {
    case 'biletix':
      return parseBiletix($, platform);
    case 'passo':
      return parsePasso($, platform);
    case 'bubilet':
      return parseBubilet($, platform);
  }
}

// ---- Browser-like fetch ----
async function fetchAsBrowser(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return await res.text();
}

// ---- BILETIX PARSER ----
function parseBiletix($: cheerio.CheerioAPI, platform: string): SeatingResult | null {
  const blocks = new Map<string, SeatingBlock>();
  
  // Venue name
  const venueName = $('.venue-name, .venue, .location, h2.location, [data-venue]')
    .first()
    .text()
    .trim() || undefined;

  // Strateji 1: Pricing tablosundan kategorileri çek
  $('.priceTable tr, .ticket-row, [class*="price-item"], [class*="category-item"]').each((_, el) => {
    const $row = $(el);
    const text = $row.text().trim();
    
    // Blok harf/numara pattern'i: "Blok C", "C Blok", "101", "VIP", "Genel Giriş"
    const blockMatch = text.match(/blok\s+([A-Z0-9]{1,3})|([A-Z])\s+blok|^([A-Z0-9]{1,3})\s|(\d{3})|(VIP)|(genel\s*giri[şs])/i);
    if (blockMatch) {
      const label = blockMatch[0].trim();
      const id = slugify(label);
      const isUnnumbered = /genel|free/i.test(label);
      blocks.set(id, {
        id,
        label: normalizeBlockLabel(label),
        hasRows: !isUnnumbered,
        hasSeatNumbers: !isUnnumbered,
      });
    }
  });

  // Strateji 2: SVG/oturma haritasındaki text label'lar
  $('svg text, [class*="seatmap"] text, [class*="seating"] text').each((_, el) => {
    const text = $(el).text().trim().toUpperCase();
    // Tek harfli (A-Z), 2-3 haneli (101-999), VIP, GENEL
    if (/^[A-Z]$|^\d{2,3}$|^VIP$|^GENEL/.test(text)) {
      const id = slugify(text);
      if (!blocks.has(id)) {
        const isUnnumbered = /GENEL/.test(text);
        blocks.set(id, {
          id,
          label: normalizeBlockLabel(text),
          hasRows: !isUnnumbered,
          hasSeatNumbers: !isUnnumbered,
        });
      }
    }
  });

  if (blocks.size === 0) return null;

  const blockList = Array.from(blocks.values());
  const hasNumbered = blockList.some(b => b.hasRows);
  const hasUnnumbered = blockList.some(b => !b.hasRows);
  const mode: SeatingResult['mode'] = 
    hasNumbered && hasUnnumbered ? 'mixed' :
    hasNumbered ? 'numbered' : 'unnumbered';

  return {
    mode,
    venueName,
    platform,
    categories: [
      {
        id: 'default',
        label: 'Tribünler',
        blocks: blockList,
      },
    ],
  };
}

// ---- PASSO PARSER (basit, ileride geliştirilecek) ----
function parsePasso($: cheerio.CheerioAPI, platform: string): SeatingResult | null {
  // Passo daha çok spor odaklı, similar structure
  return parseBiletix($, platform); // şimdilik aynı stratejiyi kullan
}

// ---- BUBİLET PARSER ----
function parseBubilet($: cheerio.CheerioAPI, platform: string): SeatingResult | null {
  return parseBiletix($, platform);
}

// ---- Yardımcılar ----
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeBlockLabel(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^GENEL/i.test(t)) return 'Genel Giriş';
  if (/^VIP$/i.test(t)) return 'VIP';
  if (/^[A-Z]$/.test(t)) return `Blok ${t}`;
  if (/^\d+$/.test(t)) return t; // "101", "215"
  return raw.trim();
}