import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { slugify } from "@/lib/admin";
import { EBOOK_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload  { filename, size } -> { path, url }
 * ออก URL สำหรับอัปโหลดครั้งเดียว เบราว์เซอร์ส่งไฟล์ตรงไปที่ Storage
 * ไฟล์จึงไม่ผ่าน serverless function (ไม่ติดเพดานขนาด body และไม่เปลืองเวลา function)
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  const filename = String(body?.filename || "");
  const size = Number(body?.size);
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";

  if (!UPLOAD_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "file_type" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  // ชื่อไฟล์สุ่มต่อท้าย: ไม่ทับไฟล์ของสินค้าอื่น และเดา path ไม่ได้
  const path = `${slugify(filename.slice(0, dot)) || "file"}-${randomBytes(4).toString("hex")}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(EBOOK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl:", error?.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, url: data.signedUrl });
}
