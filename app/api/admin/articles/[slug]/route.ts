import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { refreshStorefront } from "@/lib/admin";
import { getArticleRow, normalizeArticle, removeArticle, saveArticle } from "@/lib/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { slug: string };
}

/** PUT /api/admin/articles/:slug  { ...article } -> { slug } — แก้บทความ (slug เปลี่ยนไม่ได้ ลิงก์เดิมจะได้ไม่เสีย) */
export async function PUT(req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await getArticleRow(params.slug))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await readJsonBody(req);
  const result = normalizeArticle({ ...body, slug: params.slug });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const failed = await saveArticle({ ...result.article, slug: params.slug });
  if (failed) return NextResponse.json({ error: failed }, { status: failed === "product_not_found" ? 400 : 500 });

  refreshStorefront();
  return NextResponse.json({ slug: params.slug });
}

/** DELETE /api/admin/articles/:slug -> { ok } */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await removeArticle(params.slug))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  refreshStorefront();
  return NextResponse.json({ ok: true });
}
