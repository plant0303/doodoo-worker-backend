import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';

export async function handlePhoto(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);

  const imageId = url.searchParams.get('id');

  if (!imageId) {
    return new Response(JSON.stringify({ error: '이미지 ID가 누락되었습니다.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } 
    });
  }

  // DB에서 이미지의 모든 상세 정보 조회
  const { data, error } = await supabase
    .from('images')
    .select('id, r2_key, title, keywords, file_size_mb, width, height, category, dpi, preview_url') 
    .eq('id', imageId)
    .single();

  if (error) {
    console.error(`Supabase DB error for ID ${imageId}:`, error.message);
    return new Response(JSON.stringify({ error: `Supabase error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: '이미지를 찾을 수 없습니다.' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } 
    });
  }

  // 상세 데이터를 반환합니다.
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // CORS 헤더 추가
      ...CORS_HEADERS,
    }
  });
}