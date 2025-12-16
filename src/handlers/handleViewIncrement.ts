// src/handlers/handleViewIncrement.ts

import { Env } from '../index';
import { CORS_HEADERS } from '../lib/constants';

export async function handleViewIncrement(request: Request, env: Env, id: string): Promise<Response> {
    

    // 중복 조회 방지 쿠키 확인 로직
    const cookieName = `viewed_${id}`;
    const viewedCookie = request.headers.get('Cookie')?.includes(cookieName);

    if (viewedCookie) {
        // 이미 24시간 내 조회한 경우, 카운트 증가 없이 성공 응답
        return new Response(JSON.stringify({ status: 'Already counted within 24h' }), { 
            status: 200, 
            headers: CORS_HEADERS 
        });
    }

    // KV에 조회수 증가 요청
    try {
        const key = `view_count:${id}`;
        
        // 현재 값을 가져오고, 없으면 0
        const currentCountStr = await env.VIEW_COUNT_KV.get(key);
        const currentCount = parseInt(currentCountStr || '0', 10);
        
        // 증가시킨 후 KV에 다시 저장
        const newCount = currentCount + 1;
        await env.VIEW_COUNT_KV.put(key, newCount.toString());

    } catch (e) {
        console.error('KV Storage Error:', e);
    }

    const headers = new Headers(CORS_HEADERS);
    // 쿠키 만료 24시간
    const maxAge = 60 * 60 * 24; 
    
    headers.set('Set-Cookie', `${cookieName}=true; Max-Age=${maxAge}; HttpOnly; Path=/; SameSite=Lax`);
    
    return new Response(JSON.stringify({ status: 'View count incremented (KV)' }), { 
        status: 200, 
        headers: headers 
    });
}