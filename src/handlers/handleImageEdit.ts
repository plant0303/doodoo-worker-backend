import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, Env } from '../lib/constants';

export async function handleImageEdit(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const stockId = pathParts[pathParts.length - 1]; 
  // /api/images/edit/:id 에서 id 추출

  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // 데이터 개별 조회
  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('images')
      .select(`
        *,
        stock_files (
          stock_id,
          file_type_id,
          r2_path,
          file_size_mb,
          extension:file_types(extension)
        )
      `)
      .eq('id', stockId)
      .single();
    if (error) {
      console.log('조회 실패 사유:', error.message);
      return new Response(JSON.stringify({
        error: error.message,
        triedId: stockId
      }), { status: 404, headers });
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  }

  // 메타데이터 수정 (PATCH)
  if (request.method === 'PATCH') {
    const { title, keywords } = await request.json();

    const { error } = await supabase
      .from('images')
      .update({ title, keywords, uploaded_at: new Date().toISOString() })
      .eq('id', stockId);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  // 개별 소스 파일 삭제 (DELETE)
  if (request.method === 'DELETE') {
    const fileId = url.searchParams.get('fileId'); 
    const r2Path = url.searchParams.get('r2Path'); 
    const fileType = url.searchParams.get('fileType'); 

    if (!fileId || !r2Path || !fileType) {
      return new Response(JSON.stringify({ error: '필수 파라미터(fileId, r2Path, fileType)가 누락되었습니다.' }), { status: 400, headers });
    }

    try {
      const r2Key = r2Path.split('/').slice(1).join('/');

      if (!r2Key) {
        throw new Error("유효하지 않은 R2 경로입니다.");
      }

      // R2 버킷 객체에서 해당 키를 삭제
      await env.PRIVATE_ORIGINALS.delete(r2Key);

      console.log(`[R2 삭제 완료] 버킷 내 경로: ${r2Key}`);
      const { error: dbError } = await supabase
        .from('stock_files')
        .delete()
        .eq('stock_id', fileId)
        .eq('file_type_id', fileType);

      if (dbError) throw dbError;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });

    } catch (err: any) {
      console.error('삭제 로직 에러:', err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  }

  // 새 소스 파일 추가 (POST)
  if (request.method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const extension = formData.get('extension') as string;
    const category = formData.get('category') as string;
    const title = formData.get('title') as string;

    const r2Key = `${category}/${title}.${extension}`;
    const dbPath = `${env.PRIVATE_BUCKET_NAME}/${r2Key}`;

    // R2 업로드
    await env.PRIVATE_ORIGINALS.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 확장자 ID 조회
    const { data: typeData } = await supabase
      .from('file_types')
      .select('id')
      .eq('extension', extension.toLowerCase())
      .single();

    // DB 추가
    const { error } = await supabase.from('stock_files').insert({
      stock_id: stockId,
      file_type_id: typeData?.id,
      r2_path: dbPath,
      file_size_mb: (file.size / (1024 * 1024)).toFixed(2),
    });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}