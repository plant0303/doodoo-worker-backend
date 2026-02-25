import { Env } from "./constants";


export default async function verifyAdminToken(token: string, env: Env): Promise<boolean> {
  try {
    // 1. Supabase Auth 서버에 토큰 검증 요청
    // 이 호출은 토큰이 변조되지 않았는지, 만료되지 않았는지 확인합니다.
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_ANON_KEY,
      },
    });

    // 토큰이 유효하지 않으면 즉시 거부
    if (!response.ok) {
      console.error('Token verification failed:', response.statusText);
      return false;
    }

    // 2. 인증된 유저 정보 가져오기
    const user = await response.json();

    // 3. 관리자 권한 확인 (이메일 화이트리스트 방식)
    // 실제 운영 시에는 이 부분을 DB의 roles 테이블 조회로 확장할 수 있습니다.
    const adminEmails = [
      'penitcontact@gmail.com', 
    ];

    const isAdmin = adminEmails.includes(user.email);

    if (!isAdmin) {
      console.warn(`Unauthorized access attempt by: ${user.email}`);
    }

    return isAdmin;

  } catch (error) {
    console.error('Error during token verification:', error);
    return false;
  }
}