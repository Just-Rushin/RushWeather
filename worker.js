// This project deploys via `wrangler deploy` as a Worker with static assets
// (not Cloudflare Pages), so Pages Functions conventions (functions/api/*.js)
// don't apply here. Instead, this single Worker script handles the
// /api/weather route itself and falls back to serving static files
// (index.html, scripts.js, styles.css) for everything else.

const ENDPOINTS = {
  geo: 'https://api.openweathermap.org/geo/1.0/direct',
  current: 'https://api.openweathermap.org/data/2.5/weather',
  forecast: 'https://api.openweathermap.org/data/2.5/forecast'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/weather') {
      return handleWeather(url, env);
    }

    // Everything else: serve static files from the assets directory
    return env.ASSETS.fetch(request);
  }
};

async function handleWeather(url, env) {
  const type = url.searchParams.get('type');
  const endpoint = ENDPOINTS[type];

  if (!endpoint) {
    return new Response(JSON.stringify({ message: 'Invalid or missing type parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.OPENWEATHER_API_KEY) {
    return new Response(JSON.stringify({ message: 'Server is missing OPENWEATHER_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const forwardedParams = new URLSearchParams(url.search);
  forwardedParams.delete('type');
  forwardedParams.set('appid', env.OPENWEATHER_API_KEY);

  try {
    const upstreamRes = await fetch(`${endpoint}?${forwardedParams.toString()}`);
    const body = await upstreamRes.text();

    return new Response(body, {
      status: upstreamRes.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Upstream request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
