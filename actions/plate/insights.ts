"use server";

import { getPlateInsights } from "@/lib/db";
import { getConfig } from "@/lib/settings";

import type { TimeData } from "../system";

export async function fetchPlateInsights(formDataOrPlateNumber: FormData | string, timeZone: string) {
  console.log("Fetching plate insights");
  const config = await getConfig();
  try {
    let plateNumber;
    if (formDataOrPlateNumber instanceof FormData) {
      plateNumber = formDataOrPlateNumber.get("plateNumber");
    } else {
      plateNumber = formDataOrPlateNumber;
    }

    if (!plateNumber) {
      return { success: false, error: "Plate number is required" };
    }

    const insights = await getPlateInsights(plateNumber);

    // Create an array with all 24 hour blocks
    const hourCounts = new Array(24).fill(0);

    if (insights.time_data) {
      insights.time_data.forEach((read: TimeData) => {
        const timestamp = new Date(read.timestamp);
        const localTimestamp = new Date(
          timestamp.toLocaleString("en-US", { timeZone: timeZone || "UTC" })
        );
        const localHour = localTimestamp.getHours();
        hourCounts[localHour] += read.frequency;
      });
    }

    const timeDistribution = hourCounts.map((frequency, hour) => ({
      hour_block: hour, // Pass the raw hour
      frequency,
    }));

    const mostActiveTime =
      timeDistribution.length > 0
        ? timeDistribution.reduce((max, current) =>
          current.frequency > max.frequency ? current : max
        ).hour_block
        : "No data available";

    return {
      success: true,
      data: {
        plateNumber: insights.plate_number,
        knownName: insights.known_name,
        notes: insights.notes,
        summary: {
          firstSeen: insights.first_seen_at,
          lastSeen: insights.last_seen_at,
          totalOccurrences: insights.total_occurrences,
        },
        tags: insights.tags || [],
        timeDistribution: timeDistribution,
        recentReads: insights.recent_reads || [],
        mostActiveTime: mostActiveTime,
      },
      timeFormat: config.general.timeFormat || 12,
    };
  } catch (error) {
    console.error("Failed to get plate insights:", error);
    return { success: false, error: "Failed to get plate insights" };
  }
}
