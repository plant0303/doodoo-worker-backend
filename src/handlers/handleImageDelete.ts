import { createClient } from "@supabase/supabase-js";
import { CORS_HEADERS, Env } from "../lib/constants";

export async function handleFullStockDelete(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const stockId = url.searchParams.get('stockId'); // ?stockId=UUID 형태로 전달
  
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  if (!stockId) return new Response('Stock ID 필수', { status: 400, headers });

  try {
    // 1. 해당 스톡에 연결된 모든 파일 경로(r2_path) 가져오기
    const { data: files, error: fetchError } = await supabase
      .from('stock_files')
      .select('r2_path')
      .eq('stock_id', stockId);

    if (fetchError) throw fetchError;

    // 2. R2에서 파일들 일괄 삭제
    if (files && files.length > 0) {
      for (const file of files) {
        // DB의 "버킷명/경로"에서 순수 r2Key 추출
        const r2Key = file.r2_path.split('/').slice(1).join('/');
        await env.PRIVATE_ORIGINALS.delete(r2Key);
        console.log(`[R2 삭제] ${r2Key}`);
      }
    }

    // 3. DB 레코드 삭제 (Cascade 설정이 되어있다면 images만 지워도 stock_files가 지워짐)
    // 설정이 안되어있을 수 있으므로 명시적으로 stock_files 먼저 삭제 권장
    await supabase.from('stock_files').delete().eq('stock_id', stockId);
    const { error: imageError } = await supabase.from('images').delete().eq('id', stockId);

    if (imageError) throw imageError;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err: any) {
    console.error('삭제 에러:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}