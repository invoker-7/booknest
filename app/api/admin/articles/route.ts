import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { refreshStorefront } from "@/lib/admin";
import { getArticleRow, normalizeArticle, saveArticle } from "@/lib/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/articles  { ...article } -> { slug } — เขียนบทความใหม่ */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  const result = normalizeArticle(body ?? {});
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  if (await getArticleRow(result.article.slug)) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const failed = await saveArticle(result.article);
  if (failed) return NextResponse.json({ error: failed }, { status: failed === "product_not_found" ? 400 : 500 });

  refreshStorefront();
  return NextResponse.json({ slug: result.article.slug }, { status: 201 });
}
