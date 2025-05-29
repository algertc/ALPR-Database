"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PlateTable from "./PlateTable";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  addKnownPlate,
  correctPlateRead,
  deletePlateRead,
  tagPlate,
  untagPlate,
  validatePlateRecord,
} from "@/actions";

export default function PlateTableWrapper({
  data, // Initial data from server component (props from page.jsx)
  total, // Initial total from server component
  tags,
  cameras,
  timeFormat,
  biHost,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // State for live data, initially populated with server-rendered data
  // This will be updated by SSE.
  const [liveData, setLiveData] = useState(data);
  const [liveTotal, setLiveTotal] = useState(total);

  // State to control if live updates are active (toggled by user)
  const [isLiveModeActive, setIsLiveModeActive] = useState(true);
  const eventSourceRef = useRef(null); // Ref to hold the EventSource instance

  // Derived state to check if any filters are active
  const hasActiveFilters = useCallback(() => {
    const current = new URLSearchParams(params);
    // Exclude 'page' and 'pageSize' from being considered "filters" for live mode
    return Array.from(current.keys()).some(
      (key) =>
        key !== "page" &&
        key !== "pageSize" &&
        current.get(key) !== "" &&
        current.get(key) !== "all" &&
        current.get(key) !== null
    );
  }, [params]);

  // Effect to sync server-provided data with liveData when router.refresh() happens
  // This ensures that when liveMode is off (and filters are applied), or when
  // router.refresh() is explicitly called for mutations, the `liveData` state
  // gets the fresh dataset from the server.
  useEffect(() => {
    // Only update liveData if we're not in an active filtered/sorted state that
    // would prevent SSE from being active, OR if the initial data is explicitly different.
    if (!hasActiveFilters()) {
      // If no filters are active, liveData should mirror the server's 'data' prop
      // when it changes (due to router.refresh or initial load).
      setLiveData(data);
      setLiveTotal(total);
    }
    // If filters ARE active, liveData should remain what it was before filters were applied,
    // or be replaced by the fetched 'data' if `router.refresh()` brings filtered data.
    // The conditional merge logic below handles this.
  }, [data, total, hasActiveFilters]);

  // Effect to manage SSE connection and data merging
  // useEffect(() => {
  //   if (isLiveModeActive && !hasActiveFilters()) {
  //     // Connect only if live mode is active and no filters are applied
  //     if (!eventSourceRef.current) {
  //       eventSourceRef.current = new EventSource("/api/plate-reads");
  //       console.log("SSE: Attempting to connect...");

  //       eventSourceRef.current.onopen = () => {
  //         console.log("SSE: Connection established.");
  //       };

  //       // Event listener for new plate reads (SSE delivers the actual data)
  //       eventSourceRef.current.addEventListener("new-plate-read", (event) => {
  //         console.log("SSE: Received new plate read event:", event.data);
  //         try {
  //           const newPlateReads = JSON.parse(event.data); // This is an array of new plate objects

  //           setLiveData((prevData) => {
  //             // Ensure we are on the first page to receive live updates
  //             const currentPage = parseInt(params.get("page") || "1");
  //             if (currentPage !== 1) {
  //               // If not on the first page, just signal that there's new data.
  //               // A full refresh would be needed to see it, but we won't force it.
  //               console.log(
  //                 "SSE: New data arrived but not on first page, not updating live data directly."
  //               );
  //               return prevData;
  //             }

  //             const pageSize = parseInt(params.get("pageSize") || "25");

  //             // Merge new records, ensuring uniqueness and order
  //             const combinedData = [...newPlateReads, ...prevData];
  //             const uniqueData = Array.from(
  //               new Map(combinedData.map((item) => [item.id, item])).values()
  //             );

  //             // Sort by timestamp descending to keep newest at top
  //             uniqueData.sort(
  //               (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  //             );

  //             // Trim to page size
  //             return uniqueData.slice(0, pageSize);
  //           });

  //           setLiveTotal((prevTotal) => prevTotal + newPlateReads.length); // Increment total count
  //           // router.refresh(); // No need to trigger router.refresh() here, SSE updates liveData directly.
  //         } catch (e) {
  //           console.error(
  //             "SSE: Error parsing 'new-plate-read' event:",
  //             e,
  //             event.data
  //           );
  //         }
  //       });

  //       eventSourceRef.current.addEventListener("heartbeat", (event) => {
  //         // console.log("SSE: Heartbeat received:", event.data);
  //       });

  //       eventSourceRef.current.onerror = (error) => {
  //         console.error("SSE: EventSource error:", error);
  //         eventSourceRef.current.close();
  //         eventSourceRef.current = null;
  //         // Implement reconnect logic with exponential backoff if desired
  //       };
  //     }
  //   } else {
  //     // Disconnect SSE if live mode is off or filters are applied
  //     if (eventSourceRef.current) {
  //       eventSourceRef.current.close();
  //       eventSourceRef.current = null;
  //       console.log("SSE: Connection closed.");
  //     }
  //     // When live mode is off or filters are active, ensure we are displaying the server-provided data.
  //     // This is important because the 'data' prop from page.jsx would be the filtered/sorted result.
  //     if (liveData !== data || liveTotal !== total) {
  //       setLiveData(data);
  //       setLiveTotal(total);
  //     }
  //   }

  //   // Cleanup on component unmount
  //   return () => {
  //     if (eventSourceRef.current) {
  //       eventSourceRef.current.close();
  //       eventSourceRef.current = null;
  //       console.log("SSE: Connection cleaned up on unmount.");
  //     }
  //   };
  // }, [isLiveModeActive, hasActiveFilters, params, data, total]); // Re-run if live mode or params (filters) change

  // Helper for updating URL query params
  const createQueryString = useCallback(
    (updates) => {
      const current = new URLSearchParams(params);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });
      return current.toString();
    },
    [params]
  );

  const handleUpdateFilters = useCallback(
    (newParams) => {
      // When filters are updated, automatically disable live mode
      setIsLiveModeActive(false);
      const queryString = createQueryString({ ...newParams, page: "1" });
      router.push(`${pathname}?${queryString}`);
    },
    [createQueryString, pathname, router]
  );

  const handlePageChange = useCallback(
    (direction) => {
      // Paging means live mode should be off
      setIsLiveModeActive(false);
      const currentPage = parseInt(params.get("page") || "1");
      const pageSize = parseInt(params.get("pageSize") || "25");
      const newPage = direction === "next" ? currentPage + 1 : currentPage - 1;

      if (
        newPage < 1 ||
        (direction === "next" && currentPage * pageSize >= total)
      ) {
        return;
      }

      router.push(
        `${pathname}?${createQueryString({ page: newPage.toString() })}`
      );
    },
    [createQueryString, params, pathname, router, total]
  );

  // Action handlers that trigger server-side changes and should revalidate data.
  // These *must* call `router.refresh()` to ensure the server's cache is invalidated
  // and the page.jsx re-fetches its data, which then updates the `data` prop
  // in PlateTableWrapper.
  const handleAddTag = async (plateNumber, tagName) => {
    const formData = new FormData();
    formData.append("plateNumber", plateNumber);
    formData.append("tagName", tagName);
    const result = await tagPlate(formData);
    if (result.success) {
      router.refresh();
    }
  };

  const handleRemoveTag = async (plateNumber, tagName) => {
    const formData = new FormData();
    formData.append("plateNumber", plateNumber);
    formData.append("tagName", tagName);
    const result = await untagPlate(formData);
    if (result.success) {
      router.refresh();
    }
  };

  const handleAddKnownPlate = async (plateNumber, name, notes) => {
    const formData = new FormData();
    formData.append("plateNumber", plateNumber);
    formData.append("name", name);
    formData.append("notes", notes);
    const result = await addKnownPlate(formData);
    if (result.success) {
      router.refresh();
    }
  };

  const handleDeleteRecord = async (id) => {
    const formData = new FormData();
    formData.append("id", id);
    const result = await deletePlateRead(formData);
    if (result.success) {
      router.refresh();
    }
  };

  const handleCorrectPlate = async (formData) => {
    const result = await correctPlateRead(formData);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleValidatePlate = async (id, value) => {
    const result = await validatePlateRecord(id, value);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleSort = useCallback(
    (field) => {
      // Sorting means live mode should be off
      setIsLiveModeActive(false);
      const currentSortField = params.get("sortField") || "";
      const currentSortDirection = params.get("sortDirection") || "desc";

      let newDirection = "asc";
      if (field === currentSortField) {
        newDirection = currentSortDirection === "desc" ? "asc" : "desc";
      }

      router.push(
        `${pathname}?${createQueryString({
          sortField: field,
          sortDirection: newDirection,
        })}`
      );
    },
    [createQueryString, params, pathname, router]
  );

  // Determine which data to pass to PlateTable
  const dataToDisplay =
    hasActiveFilters() || !isLiveModeActive ? data : liveData;
  const totalToDisplay =
    hasActiveFilters() || !isLiveModeActive ? total : liveTotal;

  return (
    <PlateTable
      data={dataToDisplay}
      total={totalToDisplay}
      availableTags={[{ name: "untagged", color: "#6B7280" }, ...tags]}
      availableCameras={cameras}
      timeFormat={timeFormat}
      biHost={biHost}
      pagination={{
        page: parseInt(params.get("page") || "1"),
        pageSize: parseInt(params.get("pageSize") || "25"),
        total: totalToDisplay,
        onNextPage: () => handlePageChange("next"),
        onPreviousPage: () => handlePageChange("prev"),
      }}
      filters={{
        search: params.get("search") || "",
        fuzzySearch: params.get("fuzzySearch") === "true",
        tag: params.get("tag") || "all",
        dateRange: {
          from: params.get("dateFrom")
            ? new Date(params.get("dateFrom"))
            : null,
          to: params.get("dateTo") ? new Date(params.get("dateTo")) : null,
        },
        hourRange:
          params.get("hourFrom") && params.get("hourTo")
            ? {
                from: parseInt(params.get("hourFrom")),
                to: parseInt(params.get("hourTo")),
              }
            : null,
        cameraName: params.get("camera"),
      }}
      sort={{
        field: params.get("sortField") || "timestamp",
        direction: params.get("sortDirection") || "desc",
      }}
      onSort={handleSort}
      onUpdateFilters={handleUpdateFilters}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onAddKnownPlate={handleAddKnownPlate}
      onDeleteRecord={handleDeleteRecord}
      onCorrectPlate={handleCorrectPlate}
      onValidate={handleValidatePlate}
      isLive={isLiveModeActive} // Pass the live mode state
      onLiveChange={setIsLiveModeActive} // Pass the setter for live mode
      loading={false} // Loading state is now more complex. For simplicity, we'll keep it false here.
      // A true loading state might be added with `useTransition` for server actions.
    />
  );
}
