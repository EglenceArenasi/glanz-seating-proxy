import type { VercelRequest, VercelResponse } from '@vercel/node';

// Anthropic API proxy for Glanz Light mobile app.
// Tries newest Claude models in order, falling back to older ones if needed.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Model fallback chain - tries newest first
const MODEL_FALLBACKS = [
  'claude-sonnet-4-5',           // newest sonnet alias (2025+)
  'claude-3-5-sonnet-latest',    // alias to latest 3.5 sonnet
  'claude-3-5-sonnet-20241022',  // explicit version
  'claude-3-5-haiku-latest',     // fallback to haiku
  'claude-3-haiku-20240307',     // very stable old
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const prompt: string | undefined = body?.prompt;
  const maxTokens: number = body?.max_tokens ?? 2000;
  const overrideModel: string | undefined = body?.model;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Build model try list - if user provided one, try that first
  const modelsToTry = overrideModel
    ? [overrideModel, ...MODEL_FALLBACKS]
    : MODEL_FALLBACKS;

  let lastError: { status: number; body: string; model: string } | null = null;

  for (const model of modelsToTry) {
    try {
      const anthropicRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error('[LLM Proxy] model', model, 'failed:', anthropicRes.status, errText.slice(0, 300));
        lastError = { status: anthropicRes.status, body: errText.slice(0, 300), model };
        // 404 = unknown model, 400 = bad request -> try next
        if (anthropicRes.status === 404 || anthropicRes.status === 400) continue;
        // Other errors are real - return immediately
        res.status(anthropicRes.status).json({
          error: 'Anthropic API error',
          status: anthropicRes.status,
          model,
          details: errText.slice(0, 500),
        });
        return;
      }

      const data = await anthropicRes.json();
      const text = data?.content?.[0]?.text ?? '';
      console.log('[LLM Proxy] success with model:', model, 'text length:', text.length);
      res.status(200).json({ result: text, model });
      return;
    } catch (err) {
      console.error('[LLM Proxy] exception with', model, ':', err);
      lastError = {
        status: 500,
        body: err instanceof Error ? err.message : String(err),
        model,
      };
    }
  }

  // All models failed
  res.status(404).json({
    error: 'All Anthropic models failed',
    triedModels: modelsToTry,
    lastError,
  });
}
