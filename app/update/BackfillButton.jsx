"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dbBackfill } from "@/actions";

export function BackfillButton({ onComplete }) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBackfill = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      const result = await dbBackfill();
      const message = result.success
        ? "Backfill completed successfully"
        : `Backfill failed: ${result.error}`;
      setResponse(message);
      if (result.success && onComplete) {
        onComplete();
      }
    } catch (error) {
      setResponse(`Error occurred during backfill: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleBackfill} disabled={isLoading} className="w-full">
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Backfill...
          </div>
        ) : (
          "Start Backfill"
        )}
      </Button>
      {response && (
        <div className="p-4 rounded bg-muted">
          <p className="text-sm font-medium">{response}</p>
        </div>
      )}
    </div>
  );
}
