import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);

  const query = url.searchParams.get('q');
  const category = url.searchParams.get('category');

  const page = parseInt(url.searchParams.get('p') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '30', 10);
  const offset = (page - 1) * limit;

  if (!query && !category) {
    return new Response(JSON.stringify({ error: '검색어(q) 또는 카테고리(category)를 제공해야 합니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  let dbQuery = supabase.from('images').select('id, title, thumb_url, preview_url, category', { count: 'exact' });

  if (query) {
    dbQuery = supabase.rpc('search_images', { search_query: query })
      .select('id, title, thumb_url, preview_url, category', { count: 'exact' });
  } else if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  const { data, error, count } = await dbQuery
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Supabase query error:', error.message);
    return new Response(JSON.stringify({ error: `Supabase query error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const responseData = {
    images: data || [],
    total_count: count || 0, // 전체 검색 결과 수
    page: page,
    limit: limit,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    }
  });
}