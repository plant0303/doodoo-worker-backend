import { createClient } from '@supabase/supabase-js';
import { Env } from '../lib/constants'; 

// Supabase 클라이언트 초기화 함수
export function getSupabaseClient(env: Env) {
  // SUPABASE_URL과 SUPABASE_ANON_KEY를 사용하여 클라이언트 생성
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}