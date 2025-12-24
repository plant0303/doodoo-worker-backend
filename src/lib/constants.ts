export interface Env {
  PRIVATE_ORIGINALS: R2Bucket; // 원본 파일 (보안용)
  PUBLIC_ASSETS: R2Bucket;     // 썸네일/프리뷰 (공개용)

  // Supabase 접속 정보
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;

  PUBLIC_VERCEL: string;
  PRIVATE_BUCKET_NAME: string;
}

// CORS 헤더
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};