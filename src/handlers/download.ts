import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants'; 

export async function handleDownload(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);

  const imageId = url.searchParams.get('id');

  if (!imageId) {
    return new Response('이미지 ID가 누락되었습니다.', { status: 400, headers: CORS_HEADERS });
  }

  // 1. DB에서 r2_key 조회
  const { data: imageData, error: dbError } = await supabase
    .from('images')
    .select('r2_key')
    .eq('id', imageId)
    .single();

  if (dbError || !imageData || !imageData.r2_key) {
    console.error('DB 조회 실패:', dbError ? dbError.message : '데이터 없음');
    return new Response('이미지 메타데이터(r2_key)를 찾을 수 없거나 DB 오류 발생.', { 
      status: 404, 
      headers: CORS_HEADERS 
    });
  }

  const r2Key = imageData.r2_key;

  const object = await env.PRIVATE_ORIGINALS.get(r2Key);

  if (object === null) {
    return new Response('R2 원본 파일을 찾을 수 없습니다.', { status: 404, headers: CORS_HEADERS });
  }

  const filename = r2Key.split('/').pop() || 'download.file';

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

  Object.keys(CORS_HEADERS).forEach(key => {
    const headerKey = key as keyof typeof CORS_HEADERS;
    headers.set(headerKey, CORS_HEADERS[headerKey]);
  });

  return new Response(object.body, { headers });
}