import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { addComment, loadComments, removeComment } from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } };

/**
 * GET /api/comments?article=<slug> -> { comments }
 * ดึงแยกจากหน้าบทความ (หน้าบทความยังเป็น static) — own = ความคิดเห็นของผู้ที่ล็อกอินอยู่
 */
export async function GET(req: Request) {
  const article = new URL(req.url).searchParams.get("article") || "";
  if (!article) return NextResponse.json({ comments: [] }, PRIVATE);
  const user = await getSessionUser();
  return NextResponse.json({ comments: await loadComments(article, user?.id) }, PRIVATE);
}

/** POST /api/comments  { article, body } -> { comment } — ต้องล็อกอิน */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = await readJsonBody(req);
  const result = await addComment(user, {
    article: String(body?.article || "").trim(),
    body: String(body?.body ?? ""),
  });
  if ("error" in result) {
    const status = { invalid_input: 400, too_fast: 429, not_found: 404, save_failed: 500 }[result.error];
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ comment: result.comment });
}

/** DELETE /api/comments?id=<uuid> -> { ok } — ลบของตัวเอง (ผู้ดูแลลบได้ทุกรายการ) */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!(await removeComment(id, user))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
