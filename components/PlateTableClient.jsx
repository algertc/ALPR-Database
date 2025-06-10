// components/PlateTableClient.jsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import debounce from "lodash/debounce";
import PlateTable from "./PlateTable";
import {
  addKnownPlate,
  correctPlateRead,
  deletePlateRead,
  tagPlate,
  untagPlate,
} from "@/actions";

export default function PlateTableClient({
  data,
  total,
  tags,
  cameras,
  timeFormat,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const createQueryString = (updates) => {
    const current = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    return current.toString();
  };

  const updateFilters = (newParams) => {
    const queryString = createQueryString({ ...newParams, page: "1" });
    router.push(`${pathname}?${queryString}`);
  };

  const handlePageChange = (direction) => {
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
  };

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

  const handleDeleteRecord = async (plateNumber) => {
    const formData = new FormData();
    formData.append("plateNumber", plateNumber);

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

  return (
    <PlateTable
      data={data}
      availableTags={tags}
      availableCameras={cameras}
      timeFormat={timeFormat}
      pagination={{
        page: parseInt(params.get("page") || "1"),
        pageSize: parseInt(params.get("pageSize") || "25"),
        total,
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
      onUpdateFilters={updateFilters}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onAddKnownPlate={handleAddKnownPlate}
      onDeleteRecord={handleDeleteRecord}
      onCorrectPlate={handleCorrectPlate}
    />
  );
}
