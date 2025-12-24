import { createClient } from "@supabase/supabase-js";
import { CORS_HEADERS, Env } from "../lib/constants";

export async function handleFullStockDelete(request: Request, env: Env): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };
  
  // OPTIONS 요청 처리 (CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const body = await request.json() as { ids: string[] };
    const ids = body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: '삭제할 ID(배열)가 필요합니다.' }), { status: 400, headers });
    }

    // 선택된 모든 스톡에 연결된 R2 파일 경로들을 한꺼번에 가져오기
    const { data: files, error: fetchError } = await supabase
      .from('stock_files')
      .select('r2_path')
      .in('stock_id', ids); // .in 연산자로 여러 ID를 한 번에 조회

    if (fetchError) throw fetchError;

    // R2에서 모든 파일 삭제
    if (files && files.length > 0) {
      for (const file of files) {
        const r2Key = file.r2_path.split('/').slice(1).join('/');
        if (r2Key) {
          await env.PRIVATE_ORIGINALS.delete(r2Key);
          console.log(`[R2 삭제 완료] ${r2Key}`);
        }
      }
    }

    // DB 레코드 삭제
    const { error: fileDbError } = await supabase
      .from('stock_files')
      .delete()
      .in('stock_id', ids);
    
    if (fileDbError) throw fileDbError;

    const { error: imageDbError } = await supabase
      .from('images')
      .delete()
      .in('id', ids);

    if (imageDbError) throw imageDbError;

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${ids.length}개의 항목이 성공적으로 삭제되었습니다.` 
    }), { status: 200, headers });

  } catch (err: any) {
    console.error('삭제 프로세스 에러:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}