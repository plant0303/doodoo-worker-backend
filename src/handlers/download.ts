import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';

export async function handleDownload(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const url = new URL(request.url);

  // 1. 필요한 두 개의 ID를 쿼리 파라미터에서 가져옵니다.
  const imageId = url.searchParams.get('id'); // stock_id
  const fileTypeIdStr = url.searchParams.get('type_id'); // 문자열로 받음

  if (!imageId || !fileTypeIdStr) {
    return new Response(
      JSON.stringify({ error: '이미지 ID 또는 파일 형식 ID가 누락되었습니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const fileTypeId = parseInt(fileTypeIdStr, 10);
  if (isNaN(fileTypeId)) {
    return new Response(
      JSON.stringify({ error: '파일 형식 ID가 유효하지 않습니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  console.log(`[DL-1] ID:${imageId}, Type:${fileTypeId}`);

  // 2. DB에서 stock_files와 file_types를 조인하여 r2_path와 파일 메타데이터 조회
  const { data: stockFileData, error: dbError } = await supabase
    .from('stock_files')
    .select(`
      r2_path, 
      file_types (
        extension, 
        mime_type
      )
    `)
    .eq('stock_id', imageId)
    .eq('file_type_id', fileTypeId) // ⬅️ 숫자로 된 변수 사용
    .single();

  if (dbError) {
    console.error('DB 조회 실패:', dbError.message);
    return new Response(
      JSON.stringify({ error: `DB 오류 발생: ${dbError.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  // 데이터가 없거나 r2_path가 없는 경우
  if (!stockFileData || !stockFileData.r2_path) {
    return new Response(
      JSON.stringify({ error: '요청한 파일 옵션을 찾을 수 없습니다.' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const r2Key = stockFileData.r2_path;
  const fileMeta = stockFileData.file_types;

  // 💡 수정된 부분: R2 Key에서 버킷 이름 프리픽스를 제거합니다.
  // (이 버킷 이름은 wrangler.jsonc에 정의된 이름과 같아야 합니다.)
  const BUCKET_NAME_PREFIX = "doodoo-private-originals/";
  let finalR2Key = r2Key;

  if (r2Key.startsWith(BUCKET_NAME_PREFIX)) {
    // 버킷 이름과 뒤따르는 '/'까지 제거
    finalR2Key = r2Key.substring(BUCKET_NAME_PREFIX.length);
  }

  // 이 로그로 finalR2Key가 "photo/pinkmhuly15_original_jpg.jpg"인지 확인 가능
  console.log(`[DL-3] Final R2 Key used: "${finalR2Key}"`);

  // 3. Cloudflare R2에서 파일 객체 가져오기 (수정된 키 finalR2Key 사용)
  // object = await env.PRIVATE_ORIGINALS.get("photo/pinkmhuly15_original_jpg.jpg") 호출됨
  const object = await env.PRIVATE_ORIGINALS.get(finalR2Key);
  if (object === null) {
    // 4. R2 접근 실패 확인 (이 오류가 출력되면 R2 바인딩/키 불일치가 확실합니다)
    console.error(`[DL-4] R2 object not found for key: "${r2Key}"`);
    console.error(`[DL-4] R2 object not found for key: "${finalR2Key}"`);
    return new Response(
      JSON.stringify({ error: 'R2 원본 파일을 찾을 수 없습니다. (경로 오류)' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  // 4. 다운로드 파일 이름 및 헤더 설정
  // 파일 이름은 DB에서 가져온 메타데이터를 기반으로 안전하게 생성합니다.
  const originalFilename = r2Key.split('/').pop() || 'download';
  const extension = fileMeta?.extension || 'file';

  // 최종 다운로드 파일 이름: [originalFilename_without_ext].[extension]
  const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
  const finalFilename = `${baseFilename}.${extension}`;

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);

  // Content-Type을 file_types에서 가져온 mime_type으로 설정
  if (fileMeta?.mime_type) {
    headers.set('Content-Type', fileMeta.mime_type);
  } else {
    // MIME 타입이 없으면 기본값으로 application/octet-stream 설정
    headers.set('Content-Type', 'application/octet-stream');
  }

  // Content-Disposition 설정
  headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`);

  // CORS 헤더 추가
  Object.keys(CORS_HEADERS).forEach(key => {
    const headerKey = key as keyof typeof CORS_HEADERS;
    headers.set(headerKey, CORS_HEADERS[headerKey]);
  });

  // 5. R2 파일 스트리밍 반환
  return new Response(object.body, { headers });
}