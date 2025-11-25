import { createClient } from '@supabase/supabase-js';
import { Router } from 'itty-router'; // 라우팅을 위해 itty-router 설치 및 사용 권장

// Env 인터페이스 수정: R2 버킷 2개와 Supabase URL 추가
interface Env {
	// 💡 R2 버킷 바인딩 이름 (wrangler.jsonc에 설정된 이름과 일치해야 합니다)
	PRIVATE_ORIGINALS: R2Bucket; // 원본 파일 (보안용)
	PUBLIC_ASSETS: R2Bucket;     // 썸네일/프리뷰 (공개용)

	// 💡 Supabase 접속 정보 (Secret 또는 Vars에 등록된 이름)
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	SUPABASE_SERVICE_KEY: string;
}

// Supabase 클라이언트 초기화 함수 수정: URL 환경 변수 사용
function getSupabaseClient(env: Env) {
	// SUPABASE_URL과 SUPABASE_ANON_KEY를 사용하여 클라이언트 생성
	return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// src/index.ts 내 export default { async fetch ... } 함수 내부

		// 3. 🔌 Supabase 클라이언트 초기화
		const supabase = getSupabaseClient(env);
		const url = new URL(request.url);

		// ----------------------------------------------------------------------
		// A. 이미지 검색 API 구현 (DB 조회)
		// ----------------------------------------------------------------------
		if (url.pathname === '/api/search') {
			const query = url.searchParams.get('q');

			if (!query) {
				return new Response(JSON.stringify({ error: '검색어(q)를 제공해야 합니다.' }), { status: 400 });
			}

			// 💡 수정된 부분: rpc('함수 이름', { 전달할 변수 })
			const { data, error } = await supabase
				.rpc('search_images', { search_query: query }) // 1단계에서 생성한 함수 호출
				.select('id, title, thumb_url, preview_url, width, height, category');

			if (error) {
				return new Response(JSON.stringify({ error: `Supabase RPC error: ${error.message}` }), { status: 500 });
			}

			return new Response(JSON.stringify(data), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		// ----------------------------------------------------------------------
		// B. 보안 다운로드 API 구현 (R2 Signed URL 생성)
		// ----------------------------------------------------------------------
if (url.pathname === '/api/download') {
    const imageId = url.searchParams.get('id');

    if (!imageId) {
        return new Response('이미지 ID가 누락되었습니다.', { status: 400 });
    }

    // 💡 1. DB에서 r2_key 조회
    const { data: imageData, error: dbError } = await supabase 
        .from('images')
        .select('r2_key')
        .eq('id', imageId)
        .single();

    if (dbError || !imageData || !imageData.r2_key) {
        console.error('DB 조회 실패:', dbError ? dbError.message : '데이터 없음');
        return new Response('이미지 메타데이터(r2_key)를 찾을 수 없거나 DB 오류 발생.', { status: 404 });
    }

    const r2Key = imageData.r2_key;
    
    // 💡 2. R2 객체를 가져와 Workers에서 직접 스트리밍
    const object = await env.PRIVATE_ORIGINALS.get(r2Key);

    if (object === null) {
        // 이 메시지가 뜨지 않고, 'API route not found'가 떴다는 것은 
        // 이 블록에 아예 진입하지 못했다는 뜻입니다.
        return new Response('R2 원본 파일을 찾을 수 없습니다.', { status: 404 });
    }
    
    // 💡 3. 헤더 설정 및 응답 반환
    const filename = r2Key.split('/').pop() || 'download.file';
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`); // 다운로드 유도 헤더
    
    return new Response(object.body, { headers });
}

// ----------------------------------------------------------------------
// C. 기본 404 응답
// ----------------------------------------------------------------------
return new Response('API route not found.', { status: 404 });
	},
};