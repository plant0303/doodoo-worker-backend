/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	STOCK_IMAGES: R2Bucket; 
	SUPABASE_ANON_KEY: string;
	SUPABASE_SERVICE_KEY: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/list') {
			// 2. env.STOCK_IMAGES 변수를 사용하여 R2 버킷의 API를 호출합니다.
			const listing = await env.STOCK_IMAGES.list(); 
			
			// ... 로직 처리 ...

			return new Response(JSON.stringify(listing.objects));
		}
		// ... 기타 로직 (Signed URL 생성 등) ...
	},
};