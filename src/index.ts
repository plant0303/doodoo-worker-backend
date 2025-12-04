import { Router } from 'itty-router';
import { handleSearch } from './handlers/search';
import { Env, CORS_HEADERS } from './lib/constants';
import { handleDownload } from './handlers/download';
import { handlePhoto } from './handlers/handlePhoto';
import { handleGetCategories } from './handlers/handleGetCategories';

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
    return new Response('API route not found.', { status: 404 });
  },
};