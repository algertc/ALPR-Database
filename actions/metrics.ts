"use server";

import { createHash } from "crypto";
import { execSync } from "child_process";

import {
  getTotalPlatesCount,
  getEarliestPlateData,
  getMetrics
} from "@/lib/db";

import { getLocalVersionInfo } from "@/lib/version";

import type { Tag, TimeData } from ".";

export async function sendMetricsUpdate() {
  console.log("[Metrics] Reporting usage metrics...");
  try {
    const [earliestPlate, totalPlates] = await Promise.all([
      getEarliestPlateData(),
      getTotalPlatesCount(),
    ]);

    if (!earliestPlate) return null;

    // Get system identifier that should be stable
    let systemId;
    try {
      systemId = execSync("cat /etc/machine-id").toString().trim();
    } catch {
      try {
        systemId = execSync("cat /etc/hostname").toString().trim();
      } catch {
        systemId = execSync("uname -a").toString().trim();
      }
    }

    const fingerprint = createHash("sha256")
      .update(
        `${earliestPlate.plate_number}:${earliestPlate.first_seen_at}:${systemId}`
      )
      .digest("hex");

    const payload = {
      fingerprint,
      totalPlates,
      version: await getLocalVersionInfo(),
    };

    const response = await fetch("https://alpr-metrics.algertc.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending metrics:", error);
    return false;
  }
}

export async function getDashboardMetrics(timeZone: string, startDate: Date, endDate: Date, cameraName?: string) {
  console.log("Fetching dashboard metrics");
  try {
    const metrics = await getMetrics(startDate, endDate, cameraName as any);

    // Pre-initialize the hourCounts array
    const hourCounts = new Array(24).fill(0);

    // Single pass through the data to aggregate by hour
    if (metrics.time_data) {
      metrics.time_data.forEach((read: TimeData) => {
        const timestamp = new Date(read.timestamp);
        const localTimestamp = new Date(
          timestamp.toLocaleString("en-US", { timeZone })
        );
        const localHour = localTimestamp.getHours();
        hourCounts[localHour] += read.frequency;
      });
    }

    // Convert to final format in one go
    const timeDistribution = hourCounts.map((frequency, hour_block) => ({
      hour_block,
      frequency,
    }));

    // Process tag stats
    const tagStats: Tag[] = metrics.tag_stats || [];
    const totalTaggedPlates = tagStats.reduce((sum, tag) => sum + tag.count, 0);

    // Process camera stats
    const cameraData = metrics.camera_counts || [];

    return {
      ...metrics,
      time_distribution: timeDistribution,
      camera_counts: cameraData,
      tag_stats: tagStats.map((tag: Tag) => ({
        ...tag,
        percentage: ((tag.count / totalTaggedPlates) * 100).toFixed(1),
      })),
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return {
      time_distribution: [],
      camera_counts: [],
      total_plates_count: 0,
      total_reads: 0,
      unique_plates: 0,
      new_plates_count: 0,
      suspicious_count: 0,
      top_plates: [],
      tag_stats: [],
    };
  }
}