import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { slugify } from "@/lib/admin";
import { previewFolder } from "@/lib/catalogServer";
import { EBOOK_BUCKET, IMAGE_BUCKET, imageBaseUrl, supabaseAdmin } from "@/lib/supabase";
import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// bucket รูปสินค้าถูกสร้างให้เองครั้งแรกที่มีการอัปโหลด (ไม่ต้องรัน SQL เพิ่ม)
let imageBucketReady = false;
async function ensureImageBucket(): Promise<void> {
  if (imageBucketReady) return;
  const { error } = await supabaseAdmin().storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  imageBucketReady = true;
}

/**
 * POST /api/admin/upload  { filename, size, kind?, productId? } -> { path, url, publicUrl? }
 * ออก URL สำหรับอัปโหลดครั้งเดียว เบราว์เซอร์ส่งไฟล์ตรงไปที่ Storage
 * ไฟล์จึงไม่ผ่าน serverless function (ไม่ติดเพดานขนาด body และไม่เปลืองเวลา function)
 * kind = "image" -> รูปสินค้า เก็บใน bucket สาธารณะ, ไม่ระบุ -> ไฟล์สินค้าที่ขาย เก็บใน bucket private
 * kind = "preview" + productId -> ภาพตัวอย่างเนื้อหา เก็บในโฟลเดอร์ของสินค้านั้นใน bucket สาธารณะ
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  const filename = String(body?.filename || "");
  const size = Number(body?.size);
  const preview = body?.kind === "preview";
  const image = body?.kind === "image" || preview;
  const productId = String(body?.productId || "");
  if (preview && !/^[a-z0-9-]+$/.test(productId)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";

  if (!(image ? IMAGE_EXTENSIONS : UPLOAD_EXTENSIONS).includes(ext)) {
    return NextResponse.json({ error: image ? "image_type" : "file_type" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > (image ? MAX_IMAGE_BYTES : MAX_UPLOAD_BYTES)) {
    return NextResponse.json({ error: image ? "image_too_large" : "file_too_large" }, { status: 400 });
  }

  // ชื่อไฟล์สุ่มต่อท้าย: ไม่ทับไฟล์ของสินค้าอื่น และเดา path ไม่ได้
  const file = `${slugify(filename.slice(0, dot)) || "file"}-${randomBytes(4).toString("hex")}.${ext}`;
  const path = preview ? `${previewFolder(productId)}/${file}` : file;

  if (image) {
    try {
      await ensureImageBucket();
    } catch (err) {
      console.error("ensureImageBucket:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin().storage.from(image ? IMAGE_BUCKET : EBOOK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl:", error?.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  return NextResponse.json({
    path: data.path,
    url: data.signedUrl,
    ...(image ? { publicUrl: `${imageBaseUrl()}${data.path}` } : {}),
  });
}
