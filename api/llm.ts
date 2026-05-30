// api/llm.ts
// Glanz Light LLM Proxy — web aramali Claude
// App cagirir: POST /api/llm { prompt: string, model?: string }
// Doner: { result: string, model: string }
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const prompt = (req.body?.prompt ?? '').toString();
  if (!prompt) return res.status(400).json({ error: 'prompt required in body' });

  const model = (req.body?.model ?? DEFAULT_MODEL).toString();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const anthRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        // Web arama araci — Claude gercek/guncel bilgiye bakar, uydurmaz
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthRes.ok) {
      const errText = await anthRes.text();
      console.error('[llm] anthropic error:', anthRes.status, errText.slice(0, 300));
      return res.status(anthRes.status).json({ error: `Anthropic ${anthRes.status}`, details: errText.slice(0, 300) });
    }

    const data = await anthRes.json();
    // Web search ile yanit cok-bloklu gelir: tum text bloklarini birlestir
    const result = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();

    return res.status(200).json({ result, model: data.model ?? model });
  } catch (e: any) {
    console.error('[llm] proxy error:', e?.message ?? e);
    return res.status(500).json({ error: 'LLM proxy failed', details: String(e?.message ?? e) });
  }
}
