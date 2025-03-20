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
} from "@/app/actions";

export default function PlateTableWrapper({
  data,
  total,
  tags,
  cameras,
  timeFormat,
  biHost,
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

  const handleUpdateFilters = (newParams) => {
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

  const handleValidatePlate = async (id, value) => {
    const result = await validatePlateRecord(id, value);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleSort = (field) => {
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
  };

  return (
    <PlateTable
      data={data}
      availableTags={[{ name: "untagged", color: "#6B7280" }, ...tags]}
      availableCameras={cameras}
      timeFormat={timeFormat}
      biHost={biHost}
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
      onLiveChange={(isLive) => {
        if (isLive) {
          const interval = setInterval(() => {
            router.refresh();
          }, 4500);
          return () => clearInterval(interval);
        }
      }}
    />
  );
}
