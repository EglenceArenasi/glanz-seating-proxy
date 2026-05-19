import type { VercelRequest, VercelResponse } from '@vercel/node';

// Anthropic API proxy for Glanz Light mobile app.
// Reads ANTHROPIC_API_KEY from environment (set in Vercel dashboard).
// Mobile app POSTs { prompt: string } and receives { result: string }.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed', allowed: ['POST'] });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY not configured in Vercel env vars',
    });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const prompt: string | undefined = body?.prompt;
  const maxTokens: number = body?.max_tokens ?? 2000;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[LLM Proxy] Anthropic error:', anthropicRes.status, errText);
      res.status(anthropicRes.status).json({
        error: 'Anthropic API error',
        status: anthropicRes.status,
        details: errText.slice(0, 500),
      });
      return;
    }

    const data = await anthropicRes.json();
    // Anthropic response shape: { content: [{ type: 'text', text: '...' }], ... }
    const text = data?.content?.[0]?.text ?? '';

    res.status(200).json({ result: text });
  } catch (err) {
    console.error('[LLM Proxy] Exception:', err);
    res.status(500).json({
      error: 'LLM proxy failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
