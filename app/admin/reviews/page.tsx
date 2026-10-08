import ReviewsAdminView from "@/components/admin/ReviewsAdminView";
import { withAdmin } from "@/lib/auth";
import { listAllReviews } from "@/lib/reviews";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  // ยังไม่ได้รัน supabase/content.sql: แสดงคำแนะนำแทนหน้า error
  const { data } = await withAdmin("/admin/reviews", () =>
    listAllReviews().then((reviews) => ({ reviews, ready: true }), () => ({ reviews: [], ready: false }))
  );
  return <ReviewsAdminView reviews={data.reviews} ready={data.ready} />;
}
