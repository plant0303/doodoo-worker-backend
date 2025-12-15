import { Router } from 'itty-router';
import { handleSearch } from './handlers/search';
import { Env, CORS_HEADERS } from './lib/constants';
import { handleDownload } from './handlers/download';
import { handlePhoto } from './handlers/handlePhoto';
import { handleGetCategories } from './handlers/handleGetCategories';
import { handleSimilar } from './handlers/similar';
import { handleAdminAuth } from './handlers/handleAdminAuth';
import { authenticateAdmin } from './utils/authMiddleware';

interface Env {
  PRIVATE_ORIGINALS: R2Bucket;
  PUBLIC_ASSETS: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
}


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: CORS_HEADERS
      });
    }
    const url = new URL(request.url);

    // ----------------------------------------------------
    // 관리자 API 라우팅
    // ----------------------------------------------------

    if (url.pathname === '/api/admin/auth') {
      return handleAdminAuth(request, env);
    }

    if (url.pathname.startsWith('/api/admin/')) {
      // 모든 관리자 API 요청 전에 인증 미들웨어 실행
      const authResult = await authenticateAdmin(request, env);

      if (!authResult.isAdmin && authResult.response) {
        return authResult.response; // 인증 실패 응답 반환 (401/403)
      }

      // 인증 성공 시, 세부 관리자 경로로 라우팅
      // if (url.pathname === '/api/admin/images') {
      //   // 이미지 CRUD 핸들러 호출
      //   return handleAdminImageCrud(request, env);
      // }

      // ... 기타 관리자 API 추가

      return new Response('Admin API route not found.', { status: 404 });
    }


    // ----------------------------------------------------
    // 사용자 API 라우팅
    // ----------------------------------------------------

    if (url.pathname === '/api/search') {
      return handleSearch(request, env);
    }

    if (url.pathname === '/api/categories' && request.method === 'GET') {
      return handleGetCategories(request, env);
    }

    if (url.pathname === '/api/download') {
      return handleDownload(request, env);
    }

    if (url.pathname === '/api/photo') {
      return handlePhoto(request, env);
    }

    if (url.pathname === '/api/similar') {
      return handleSimilar(request, env);
    }
    return new Response('API route not found.', { status: 404 });
  },
};