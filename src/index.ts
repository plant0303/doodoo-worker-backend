import { Router } from 'itty-router';
import { handleSearch } from './handlers/search';
import { Env, CORS_HEADERS } from './lib/constants';
import { handleDownload } from './handlers/download';
import { handlePhoto } from './handlers/handlePhoto';
import { handleGetCategories } from './handlers/handleGetCategories';
import { handleSimilar } from './handlers/similar';
import { handleAdminAuth } from './handlers/handleAdminAuth';
import { authenticateAdmin } from './utils/authMiddleware';
import { handleViewIncrement } from './handlers/handleViewIncrement';
import { handleBatchUpdate } from './handlers/handleBatchUpdate';
import { handleGetImages } from './handlers/handleGetImages';
import { handleImageUpload } from './handlers/handleImageUpload';
import { handleImageEdit } from './handlers/handleImageEdit';
import { handleFullStockDelete } from './handlers/handleImageDelete';

interface Env {
  PRIVATE_ORIGINALS: R2Bucket;
  PUBLIC_ASSETS: R2Bucket;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  VIEW_COUNT_KV: KVNamespace;
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
    const path = url.pathname;

    // ----------------------------------------------------
    // 관리자 API 라우팅
    // ----------------------------------------------------

    if (url.pathname === '/api/images' && request.method === 'GET') {
      return handleGetImages(request, env);
    }
    if (url.pathname === '/api/images/upload' && request.method === 'POST') {
      return handleImageUpload(request, env);
    }

    // admin 개별수정
    if (url.pathname.startsWith('/api/images/edit')) {
      return handleImageEdit(request, env);
    }

    // admin 삭제
    if (url.pathname === '/api/images/delete') {
      return handleFullStockDelete(request, env); 
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

    if (url.pathname === '/api/photo' && request.method === 'GET') {
      // 1. 쿼리 파라미터에서 ID 추출
      const imageId = url.searchParams.get('id');

      if (imageId && imageId.length > 5) { // 유효한 ID인지 확인

        const photoResponse = await handlePhoto(request, env, imageId);

        const viewIncrementResponse = await handleViewIncrement(request, env, imageId);

        const responseHeaders = new Headers(photoResponse.headers);
        const setCookieHeader = viewIncrementResponse.headers.get('Set-Cookie');

        if (setCookieHeader) {
          responseHeaders.set('Set-Cookie', setCookieHeader);
        }

        return new Response(photoResponse.body, {
          status: photoResponse.status,
          headers: responseHeaders,
        });
      }

      return new Response(JSON.stringify({ error: '이미지 ID(id) 쿼리 파라미터가 누락되었습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (url.pathname === '/api/similar') {
      return handleSimilar(request, env);
    }
    return new Response('API route not found.', { status: 404 });
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Batch update scheduler started.');

    // DB 업데이트 작업이 완료될 때까지 Workers를 유지합니다.
    ctx.waitUntil(handleBatchUpdate(env));
  }
};