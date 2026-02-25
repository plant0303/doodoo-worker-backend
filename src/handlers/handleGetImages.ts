import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, Env } from '../lib/constants';

export async function handleGetImages(request: Request, env: Env) {
  // 1. Supabase 클라이언트 초기화
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  // 2. 쿼리 파라미터 추출 (페이지네이션 등)
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 3. 데이터 조회 쿼리 작성
  let query = supabase
    .from('images')
    .select('id, title, thumb_url, uploaded_at, category, views ', { count: 'exact' }) // 전체 개수도 포함
    .order('uploaded_at', { ascending: false }) // 최신순 정렬

  // 카테고리 필터가 있다면 추가
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 4. 응답 반환
  return new Response(
    JSON.stringify({
      data,
      page,
      limit,
      totalCount: count,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
}