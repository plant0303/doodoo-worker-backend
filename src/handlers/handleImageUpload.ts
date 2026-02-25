import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, Env } from '../lib/constants';

export async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const formData = await request.formData();
    const category = formData.get('category') as string;
    const metadataRaw = formData.get('metadata') as string;

    if (!metadataRaw) {
      return new Response(JSON.stringify({ error: '메타데이터가 없습니다.' }), { status: 400, headers });
    }

    const items = JSON.parse(metadataRaw);
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // 1. DB에서 지원하는 확장자 정보 미리 로드
    const { data: fileTypes } = await supabase.from('file_types').select('*');
    const fileTypeMap = Object.fromEntries(
      fileTypes?.map((t) => [t.extension.toLowerCase(), t.id]) || []
    );

    const uploadedIds = [];

    // 2. 각 스톡 아이템(그룹) 순회
    for (const item of items) {

      let previewUrl = '';
      let thumbUrl = '';

      // 1. 프리뷰 이미지 업로드 
      if (item.previewFormKey) {
        const previewFile = formData.get(item.previewFormKey) as File;
        if (previewFile) {
          const ext = previewFile.name.split('.').pop() || 'jpg';
          const previewKey = `${category}/${item.title}_preview.${ext}`;

          await env.PUBLIC_ASSETS.put(previewKey, previewFile.stream(), {
            httpMetadata: { contentType: previewFile.type },
          });
          // R2 퍼블릭 도메인 또는 워커 주소와 결합
          previewUrl = `${env.PUBLIC_VERCEL}/${previewKey}`;
        }
      }

      // 2. 썸네일 이미지 업로드 (존재할 경우)
      if (item.thumbFormKey) {
        const thumbFile = formData.get(item.thumbFormKey) as File;
        if (thumbFile) {
          const ext = thumbFile.name.split('.').pop() || 'jpg';
          const thumbKey = `${category}/${item.title}_thum.${ext}`;
          
          await env.PUBLIC_ASSETS.put(thumbKey, thumbFile.stream(), {
            httpMetadata: { contentType: thumbFile.type },
          });
          thumbUrl = `${env.PUBLIC_VERCEL}/${thumbKey}`;
        }
      }


      // Step A: images 테이블에 기본 정보 저장
      const { data: imageData, error: imgError } = await supabase
        .from('images')
        .insert({
          title: item.title,
          category: category,
          keywords: item.keywords,
          // R2 퍼블릭 도메인 설정 필요
          preview_url: previewUrl,
          thumb_url: thumbUrl,
        })
        .select()
        .single();

      if (imgError) throw new Error(`이미지 정보 저장 실패: ${imgError.message}`);

      const stockId = imageData.id;

      // Step B: 해당 아이템의 모든 소스 파일 처리
      for (const fileMeta of item.files) {
        const file = formData.get(fileMeta.formKey) as File;
        if (!file) continue;

        const r2Key = `${category}/${item.title}.${fileMeta.extension}`;
        const dbPath = `${env.PRIVATE_BUCKET_NAME}/${r2Key}`;

        // R2 업로드 수행
        await env.PRIVATE_ORIGINALS.put(r2Key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        const fileTypeId = fileTypeMap[fileMeta.extension.toLowerCase()];
        if (!fileTypeId) {
          console.warn(`${fileMeta.extension}은 등록되지 않은 확장자입니다.`);
          continue;
        }

        // stock_files 테이블 상세 정보 저장
        const { error: fileError } = await supabase
          .from('stock_files')
          .insert({
            stock_id: stockId,
            file_type_id: fileTypeId,
            r2_path: dbPath,
            file_size_mb: parseFloat(fileMeta.fileSizeMb),
            width: fileMeta.width,   // 프론트에서 보낸 null 값이 그대로 저장됨
            height: fileMeta.height, // 프론트에서 보낸 null 값이 그대로 저장됨
            dpi: fileMeta.dpi,
          });

        if (fileError) throw new Error(`파일 정보 저장 실패: ${fileError.message}`);
      }

      uploadedIds.push(stockId);
    }

    return new Response(
      JSON.stringify({ success: true, count: uploadedIds.length, ids: uploadedIds }),
      { status: 200, headers, ...CORS_HEADERS }
    );

  } catch (error: any) {
    console.error('Upload error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers }
    );
  }
}