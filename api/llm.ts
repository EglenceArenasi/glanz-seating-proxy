import type { VercelRequest, VercelResponse } from '@vercel/node';

// Anthropic API proxy for Glanz Light mobile app
// Hardened version with explicit error capture at every step

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const MODEL_FALLBACKS = [
  'claude-sonnet-4-5',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-latest',
  'claude-3-haiku-20240307',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Top-level try wraps everything - no unhandled crash
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed', method: req.method });
      return;
    }

    // 1. API key check with trim (whitespace can break headers)
    const rawKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : '';
    if (!apiKey) {
      res.status(500).json({
        error: 'ANTHROPIC_API_KEY not configured or empty',
        keyExists: !!rawKey,
      });
      return;
    }

    // 2. Body parsing - Vercel may give object OR string
    let body: any;
    try {
      if (typeof req.body === 'string') {
        body = req.body ? JSON.parse(req.body) : {};
      } else if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        body = {};
      }
    } catch (parseErr) {
      res.status(400).json({
        error: 'Body parse failed',
        message: parseErr instanceof Error ? parseErr.message : String(parseErr),
        bodyType: typeof req.body,
      });
      return;
    }

    const prompt: string | undefined = body?.prompt;
    const maxTokens: number = Number(body?.max_tokens) || 2000;
    const overrideModel: string | undefined = body?.model;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid prompt',
        receivedKeys: body ? Object.keys(body) : [],
      });
      return;
    }

    // 3. Try models in fallback chain
    const modelsToTry = overrideModel
      ? [overrideModel, ...MODEL_FALLBACKS]
      : MODEL_FALLBACKS;

    let lastError: { status: number; body: string; model: string } | null = null;

    for (const model of modelsToTry) {
      let anthropicRes: Response;
      try {
        anthropicRes = await fetch(ANTHROPIC_API_URL, {
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
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error('[LLM Proxy] fetch threw for model', model, ':', msg);
        lastError = { status: 0, body: 'fetch threw: ' + msg, model };
        continue;
      }

      if (!anthropicRes.ok) {
        let errText = '';
        try { errText = await anthropicRes.text(); } catch {}
        console.error('[LLM Proxy] model', model, 'failed:', anthropicRes.status, errText.slice(0, 300));
        lastError = { status: anthropicRes.status, body: errText.slice(0, 300), model };
        if (anthropicRes.status === 404 || anthropicRes.status === 400) continue;
        res.status(anthropicRes.status).json({
          error: 'Anthropic API error',
          status: anthropicRes.status,
          model,
          details: errText.slice(0, 500),
        });
        return;
      }

      let data: any;
      try {
        data = await anthropicRes.json();
      } catch (jsonErr) {
        console.error('[LLM Proxy] response json parse failed:', jsonErr);
        lastError = {
          status: 500,
          body: 'json parse failed: ' + (jsonErr instanceof Error ? jsonErr.message : String(jsonErr)),
          model,
        };
        continue;
      }

      const text = data?.content?.[0]?.text ?? '';
      console.log('[LLM Proxy] success with model:', model, 'text length:', text.length);
      res.status(200).json({ result: text, model });
      return;
    }

    // All models failed
    res.status(502).json({
      error: 'All Anthropic models failed',
      triedModels: modelsToTry,
      lastError,
    });
  } catch (topErr) {
    // This MUST always return JSON - never crash silently
    console.error('[LLM Proxy] top-level exception:', topErr);
    try {
      res.status(500).json({
        error: 'Internal error in LLM proxy',
        message: topErr instanceof Error ? topErr.message : String(topErr),
        stack: topErr instanceof Error ? topErr.stack?.slice(0, 800) : undefined,
      });
    } catch {
      // res may have already been sent
    }
  }
}
