// Cloudflare Worker at /api/chat
// Bind an OpenAI API key via `wrangler secret put OPENAI_API_KEY`
// Route this worker so your GitHub Pages app can call /api/chat

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/chat') {
      return new Response('Not found', { status: 404 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { messages } = await request.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages[]' }), { status: 400 });
    }

    // Compose a safety + brand-aware system message
    const sys = {
      role: 'system',
      content: [
        'You are a L’Oréal assistant. Provide concise, brand-agnostic guidance suitable for a demo.',
        'Respect: no diagnostics or medical claims; recommend dermatologist consults for conditions.',
        'If you recommend products from our demo list, include a tag like: [ADD id=sk-spf50]'
      ].join(' ')
    };

    const payload = {
      model: 'gpt-5-mini', // or `gpt-5` depending on your plan
      messages: [sys, ...messages],
      temperature: 0.7
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Pass through the OpenAI response; front-end expects choices[0].message.content
    const data = await r.text();
    return new Response(data, { status: r.status, headers: { 'Content-Type': 'application/json' }});
  }
};
