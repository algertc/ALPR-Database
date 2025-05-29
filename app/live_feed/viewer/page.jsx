import { getCameraNames, getTimeFormat, getSettings, getLatestPlateReads, getTags } from "@/actions";

import DashboardLayout from "@/components/layout/MainLayout";
import TitleNavbar from "@/components/layout/LiveFeedNav";
import { Suspense } from "react";
import LiveRecognitionViewer from "@/components/LiveRecognitionViewer";
import LiveFeedSkeleton from "@/components/LiveFeedSkeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Make sure the page is always fresh

export default async function LiveViewerPage() {
  // We only need the most recent plate read
  const params = {
    page: 1,
    pageSize: 1,
    sortField: "timestamp",
    sortDirection: "desc",
  };

  const [platesRes, tagsRes, camerasRes, timeFormat, config] =
    await Promise.all([
      getLatestPlateReads(params),
      getTags(),
      getCameraNames(),
      getTimeFormat(),
      getSettings(),
    ]);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <DashboardLayout>
      <TitleNavbar title="ALPR Recognition Feed">
        <Suspense fallback={<LiveFeedSkeleton />}>
          <LiveRecognitionViewer
            latestPlate={platesRes.data[0] || null}
            tags={tagsRes.success ? tagsRes.data : []}
            cameras={camerasRes.success ? camerasRes.data : []}
            timeFormat={timeFormat}
            biHost={config?.blueiris?.host}
          />
        </Suspense>
      </TitleNavbar>
    </DashboardLayout>
  );
}
