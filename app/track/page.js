import { Suspense } from "react";
import TrackView from "@/components/views/TrackView";

export const dynamic = "force-dynamic";

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="empty"><p>...</p></div>}>
      <TrackView />
    </Suspense>
  );
}
