import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);

  const query = url.searchParams.get('q');
  const page = parseInt(url.searchParams.get('p') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '30', 10);
  const offset = (page - 1) * limit;

  if (!query) {
    return new Response(JSON.stringify({ error: '검색어(q)를 제공해야 합니다.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } 
    });
  }

  const { data, error, count } = await supabase
    .rpc('search_images', { search_query: query })
    .select('id, title, thumb_url, preview_url, width, height, category', { count: 'exact' })
    .range(offset, offset + limit - 1); // 페이지네이션 적용

  if (error) {
    console.error('Supabase RPC error:', error.message);
    return new Response(JSON.stringify({ error: `Supabase RPC error: ${error.message}` }), {
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