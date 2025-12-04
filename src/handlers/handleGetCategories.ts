import { CORS_HEADERS } from "../lib/constants";
import { getSupabaseClient } from "../lib/supabase";

export async function handleGetCategories(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);

  try {
    const { data, error } = await supabase
      .from('images')
      .select('category', { distinct: true });

    if (error) {
      console.error('Supabase category fetch error:', error.message);
      return new Response(JSON.stringify({ error: `Supabase error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const categories = data ? data.map(item => item.category) : [];

    const responseData = {
      categories: categories,
      total_count: categories.length,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      }
    });
  } catch (e) {
    console.error('Unexpected error fetching categories:', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}