"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { generateTrainingData } from "@/actions";

export function TrainingControl() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const startTrainingGeneration = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setStatus("Starting training data generation...");

      const result = await generateTrainingData();

      setStatus("Training data successfully generated and uploaded!");
      if (result.ocrCount || result.licensePlateCount) {
        setStatus(
          (prev) =>
            prev +
            `\n${result.ocrCount || 0} OCR records and ${
              result.licensePlateCount || 0
            } license plate records processed.`
        );
      }
    } catch (err) {
      setError(err.message);
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Training Data</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Generate and upload training data from your validated plate reads.
          This process will:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
          <li>Process validated and unvalidated plate reads</li>
          <li>
            Generate training datasets for both OCR and license plate detection
          </li>
          <li>Upload the data securely to the training server</li>
        </ul>

        {status && (
          <Alert className="mb-4">
            <AlertDescription>
              {status.split("\n").map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={startTrainingGeneration} disabled={isGenerating}>
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGenerating ? "Generating..." : "Generate Training Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}
