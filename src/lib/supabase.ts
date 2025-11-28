import { createClient } from '@supabase/supabase-js';
import { Env } from '../lib/constants'; 

// Supabase 클라이언트 초기화 함수
export function getSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}