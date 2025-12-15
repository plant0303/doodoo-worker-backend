// src/utils/authMiddleware.ts

import { Env } from '../index';
import { handleAdminAuth } from '../handlers/handleAdminAuth'; // 위에서 만든 함수 import

// 미들웨어 역할을 하는 함수
export async function authenticateAdmin(request: Request, env: Env): Promise<{ isAdmin: boolean; response: Response | null }> {
  // POST, PUT, DELETE 등 관리자만 접근할 수 있는 요청인지 확인

  // handleAdminAuth 로직을 거의 그대로 사용하거나,
  // 더 효율적인 방법으로 토큰 검증 및 역할 확인을 수행합니다.

  // 토큰 검증에 실패하거나 역할이 'admin'이 아니면 403/401 응답 반환
  const authResponse = await handleAdminAuth(request, env);

  if (authResponse.status !== 200) {
    return { isAdmin: false, response: authResponse }; // 오류 응답 반환
  }

  // 인증 성공
  return { isAdmin: true, response: null };
}