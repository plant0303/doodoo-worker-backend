import { getSupabaseClient } from '../lib/supabase';
import { Env, CORS_HEADERS } from '../lib/constants';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

  const BUCKET_NAME_PREFIX = "doodoo-private-originals/";
  let finalR2Key = r2Key;

  if (r2Key.startsWith(BUCKET_NAME_PREFIX)) {
    // 버킷 이름과 뒤따르는 '/'까지 제거
    finalR2Key = r2Key.substring(BUCKET_NAME_PREFIX.length);
  }

  console.log(`[DL-3] Final R2 Key used: "${finalR2Key}"`);

  try {
    // 3. S3 Client 설정 (Cloudflare R2용)
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log(env.ACCOUNT_ID);

    // 4. Presigned URL 생성
    const command = new GetObjectCommand({
      Bucket: "doodoo-private-originals", // 실제 R2 버킷 이름
      Key: finalR2Key,
      ResponseContentDisposition: `attachment; filename="download.${stockFileData.file_types?.extension}"`,
      ResponseContentType: stockFileData.file_types?.mime_type || "application/octet-stream",
    });

    // 유효시간 1시간(3600초)
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // 5. 클라이언트에게 서명된 URL 반환
    return new Response(JSON.stringify({ downloadUrl: signedUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (err: any) {
    console.error("Signed URL 생성 실패:", err);
    return new Response(JSON.stringify({ error: '서명 생성 실패' }), { status: 500, headers: CORS_HEADERS });
  }

}