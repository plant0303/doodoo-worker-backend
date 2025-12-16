// src/handlers/handleBatchUpdate.ts

import { Env } from '../index';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';
import * as Postgrest from '@supabase/postgrest-js';

export async function handleBatchUpdate(env: Env): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient(env);
  const updates: { id: string; increment: number }[] = [];

  // 1. KV에서 모든 'view_count:' 키를 가져옵니다.
  let cursor: string | undefined;

  do {
    const list = await env.VIEW_COUNT_KV.list({ prefix: 'view_count:', cursor });

    for (const key of list.keys) {
      const imageId = key.name.split(':')[1];
      const countStr = await env.VIEW_COUNT_KV.get(key.name);
      const increment = parseInt(countStr || '0', 10);

      if (increment > 0) {
        updates.push({ id: imageId, increment });
      }

      // 처리 후 KV에서 삭제 (다음 배치에서 중복 반영 방지)
      await env.VIEW_COUNT_KV.delete(key.name);
    }
    cursor = list.cursor;
  } while (cursor);

  if (updates.length === 0) {
    console.log('No view counts to update.');
    return;
  }

  console.log(`Processing ${updates.length} image updates.`);

  // 2. Supabase DB에 배치 업데이트 적용 (Postgres Function 또는 개별 업데이트)
  // Supabase는 SQL 템플릿 업데이트를 지원하므로, 각 항목별로 업데이트를 실행합니다.

  const functionCallPromises = updates.map(update =>
    supabaseAdmin
      .rpc('increment_image_view_count', {
        // 함수의 인자로 전달될 이름은 SQL 함수 정의의 파라미터 이름과 일치해야 합니다.
        p_image_id: update.id,
        p_increment_by: update.increment
      })
  );

  // 모든 업데이트를 병렬로 실행
  const results = await Promise.all(functionCallPromises);

  const errors = results.filter(res => res.error).map(res => res.error);
  if (errors.length > 0) {
    console.error('Batch update failed for some images:', errors);
  } else {
    console.log(`Successfully updated ${updates.length} image view counts.`);
  }
}