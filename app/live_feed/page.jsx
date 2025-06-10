// app/dashboard/plates/page.jsx
import { getCameraNames, getTimeFormat, getSettings, getLatestPlateReads, getTags } from "@/actions";

import PlateTableWrapper from "@/components/PlateTableWrapper"; // Correct path to wrapper
import DashboardLayout from "@/components/layout/MainLayout";
import BasicTitle from "@/components/layout/BasicTitle";
import { Suspense } from "react";
import LiveFeedSkeleton from "@/components/LiveFeedSkeleton";
import Link from "next/link";
import TitleNavbar from "@/components/layout/LiveFeedNav";

import { Button } from "@/components/ui/button";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic"; // Ensures data is fetched on every request

export default async function LivePlates(props) {
  noStore(); // Opt-out of data caching for this component and its data fetches

  const searchParams = await props.searchParams;

  const params = {
    page: parseInt(searchParams?.page || "1"),
    pageSize: parseInt(searchParams?.pageSize || "25"),
    search: searchParams?.search || "",
    fuzzySearch: searchParams?.fuzzySearch === "true",
    tag: searchParams?.tag || "all",
    dateRange:
      searchParams?.dateFrom && searchParams?.dateTo
        ? { from: searchParams.dateFrom, to: searchParams.dateTo }
        : null,
    hourRange:
      searchParams?.hourFrom && searchParams?.hourTo
        ? {
            from: parseInt(searchParams.hourFrom),
            to: parseInt(searchParams.hourTo),
          }
        : null,
    cameraName: searchParams?.camera,
    sortField: searchParams?.sortField,
    sortDirection: searchParams?.sortDirection,
  };

  const [platesRes, tagsRes, camerasRes, timeFormat, config] =
    await Promise.all([
      getLatestPlateReads(params),
      getTags(),
      getCameraNames(),
      getTimeFormat(),
      getSettings(),
    ]);

  return (
    <DashboardLayout>
      <TitleNavbar title="ALPR Recognition Feed">
        <Suspense fallback={<LiveFeedSkeleton />}>
          <PlateTableWrapper
            data={platesRes.data}
            total={platesRes.pagination.total}
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
