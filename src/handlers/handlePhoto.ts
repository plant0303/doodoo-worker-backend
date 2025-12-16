import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';

export async function handlePhoto(request: Request, env: Env, imageId: string): Promise<Response> {
  const supabase = getSupabaseClient(env);

  if (!imageId) {
    return new Response(JSON.stringify({ error: '이미지 ID가 누락되었습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const { data: imageData, error } = await supabase
    .from('images')
    .select(`
      id, 
      title, 
      keywords, 
      category, 
      preview_url,
      uploaded_at,
      stock_files (
        file_size_mb, 
        width, 
        height, 
        dpi,
        file_types (
          id,
          extension, 
          label,
          mime_type
        )
      )
    `)
    .eq('id', imageId)
    .single();

  if (error) {
    console.error(`Supabase DB error for ID ${imageId}:`, error.message);
    return new Response(JSON.stringify({ error: `Supabase error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (!imageData) {
    return new Response(JSON.stringify({ error: '이미지를 찾을 수 없습니다.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const { stock_files, ...imageMeta } = imageData;

  const downloadOptions = stock_files.map(sf => ({
    // stock_files의 메타데이터
    file_size_mb: sf.file_size_mb,
    width: sf.width,
    height: sf.height,
    dpi: sf.dpi,
    // file_types의 정보
    file_type_id: sf.file_types.id,
    extension: sf.file_types.extension,
    label: sf.file_types.label,
    mime_type: sf.file_types.mime_type
    // R2 경로는 다운로드 API에서만 사용되므로 여기서는 제외합니다 (보안 강화).
  }));

  const responseData = {
    ...imageMeta,
    download_options: downloadOptions,
  };

  // 상세 데이터를 반환합니다.
  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    }
  });
}