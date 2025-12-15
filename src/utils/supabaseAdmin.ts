// src/utils/supabaseAdmin.ts

import { createClient } from '@supabase/supabase-js';
import { Env } from '../index'; // Env 타입 정의를 가져옵니다.

export function getSupabaseAdminClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}