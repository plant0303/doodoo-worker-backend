import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import { CORS_HEADERS, Env } from '../lib/constants';

export async function handleSimilar(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);
  const imageId = url.searchParams.get("id");

  if (!imageId) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), { status: 400 });
  }

  // 1) 대상 이미지 가져오기
  const { data: target, error: targetError } = await supabase
    .from("images")
    .select("id, title, keywords")
    .eq("id", imageId)
    .single();

  if (targetError || !target) {
    return new Response(JSON.stringify({ error: "Image not found" }), { status: 404 });
  }

  // keywords를 문자열로 합치기
  const searchText = `${target.title} ${target.keywords.join(" ")}`;

  // 2) 유사한 이미지 검색
  const { data: similarImages, error: searchError } = await supabase.rpc("search_similar_images", {
    query_text: searchText,
    exclude_id: imageId
  });

  if (searchError) {
    return new Response(JSON.stringify({ error: searchError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ target, similar: similarImages }), {
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
};