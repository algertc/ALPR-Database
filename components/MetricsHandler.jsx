"use client";

import { useEffect } from "react";
import { sendMetricsUpdate } from "@/actions";

export function MetricsHandler() {
  useEffect(() => {
    const checkAndSendMetrics = async () => {
      // Check localStorage for last send time
      const lastSent = localStorage.getItem("metricsLastSent");
      const now = Date.now();

      if (!lastSent || now - Number(lastSent) > 7 * 24 * 60 * 60 * 1000) {
        // More than a week since last send (or never sent)
        await sendMetricsUpdate();
        localStorage.setItem("metricsLastSent", now.toString());
      }
    };

    // Run on mount
    checkAndSendMetrics();
  }, []);

  return null;
}
