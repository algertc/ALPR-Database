"use client";

import { useEffect } from "react";
import { processTrainingData } from "@/actions";

export function TrainingDataHandler() {
  useEffect(() => {
    // Simple function to trigger training processing
    const triggerTrainingProcess = async () => {
      try {
        await processTrainingData();
      } catch (error) {
        console.error("Error triggering training process:", error);
      }
    };

    // Run with a slight delay to avoid blocking page load
    const timer = setTimeout(triggerTrainingProcess, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
