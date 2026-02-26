import { Env, CORS_HEADERS } from '../lib/constants';

export async function handleSitemapData(request: Request, env: Env) {
  try {
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/images?select=id,uploaded_at,preview_url&order=uploaded_at.desc`;

    const response = await fetch(supabaseUrl, {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Supabase fetch failed');

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch sitemap data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}