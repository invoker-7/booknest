import CommentsAdminView from "@/components/admin/CommentsAdminView";
import { withAdmin } from "@/lib/auth";
import { listAllComments } from "@/lib/comments";

export const metadata = { title: "Comments" };

export default async function AdminCommentsPage() {
  // ยังไม่ได้รัน supabase/comments.sql: แสดงคำแนะนำแทนหน้า error
  const { data } = await withAdmin("/admin/comments", () =>
    listAllComments().then((comments) => ({ comments, ready: true }), () => ({ comments: [], ready: false }))
  );
  return <CommentsAdminView comments={data.comments} ready={data.ready} />;
}
