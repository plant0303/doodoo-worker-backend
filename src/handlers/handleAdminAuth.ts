// src/handlers/handleAdminAuth.ts

import { Env } from '../index';
import { CORS_HEADERS } from '../lib/constants';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';
// ... CORS_HEADERS 등 필요한 유틸리티 import

export async function handleAdminAuth(request: Request, env: Env): Promise<Response> {
  // POST 요청만 허용합니다.
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const supabaseAdmin = getSupabaseAdminClient(env);
  
  // 1. 요청 헤더에서 인증 토큰(JWT)을 0가져옵니다.
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { 
      status: 401, headers: CORS_HEADERS 
    });
  }

  // 2. Supabase Admin 클라이언트를 사용하여 토큰 유효성 검증 및 사용자 정보 추출
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    console.error('Token validation failed:', error);
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
      status: 401, headers: CORS_HEADERS 
    });
  }

  // 3. 사용자 ID를 사용하여 데이터베이스에서 'role' 확인 (이 부분이 핵심 보안 로직)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || profile.role !== 'admin') {
    console.error('Authorization failed: User is not admin', profileError);
    return new Response(JSON.stringify({ error: 'Access denied: Not an administrator' }), { 
      status: 403, headers: CORS_HEADERS 
    });
  }

  // 4. 관리자 권한 확인 성공
  return new Response(JSON.stringify({ message: 'Authentication successful', isAdmin: true }), { 
    status: 200, headers: CORS_HEADERS 
  });
}