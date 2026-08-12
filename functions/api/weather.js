// Cloudflare Pages Function — runs server-side only.
// The OpenWeather key never reaches the browser: it's read here from an
// environment variable/secret and appended before the request goes out.
//
// Route: GET /api/weather?type=geo|current|forecast&...other query params

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  const endpoints = {
    geo: 'https://api.openweathermap.org/geo/1.0/direct',
    current: 'https://api.openweathermap.org/data/2.5/weather',
    forecast: 'https://api.openweathermap.org/data/2.5/forecast'
  };

  if (!endpoints[type]) {
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

  // Forward all incoming query params except `type`, then add the secret key
  const forwardedParams = new URLSearchParams(url.search);
  forwardedParams.delete('type');
  forwardedParams.set('appid', env.OPENWEATHER_API_KEY);

  try {
    const upstreamRes = await fetch(`${endpoints[type]}?${forwardedParams.toString()}`);
    const body = await upstreamRes.text(); // pass through as-is, whatever the shape

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