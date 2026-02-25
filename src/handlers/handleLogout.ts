// auth.ts 또는 별도 핸들러 파일

import { CORS_HEADERS, Env } from "../lib/constants";

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    // 1. 요청 헤더에서 토큰 추출 (필요 시)
    const authHeader = request.headers.get('Authorization');
    
    /* 참고: JWT 방식은 서버에 상태를 저장하지 않으므로 
       서버에서 토큰을 즉시 '파괴'할 수는 없습니다.
       대신 클라이언트에게 성공 응답을 보내 로컬 세션을 지우게 유도합니다.
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '성공적으로 로그아웃되었습니다.' 
      }), 
      {
        status: 200,
        headers: CORS_HEADERS, // 이전에 정의한 공통 CORS 헤더
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '로그아웃 처리 중 오류 발생' }), 
      { status: 500, headers: CORS_HEADERS }
    );
  }
}