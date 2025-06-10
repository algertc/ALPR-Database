"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { migrateImageDataToFiles, clearImageData } from "@/actions";

export const dynamic = "force-dynamic";

export default function MigrationPage() {
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [message, setMessage] = useState("");

  const handleStep1 = async () => {
    setLoading1(true);
    setMessage("Starting migration...");

    try {
      const result = await migrateImageDataToFiles();
      if (result.success) {
        setStep1Complete(true);
        setMessage(
          `Successfully migrated ${result.processed.toLocaleString()} of ${result.totalRecords.toLocaleString()} remaining records with old base64 data${
            result.errors > 0 ? ` (${result.errors} errors)` : ""
          }`
        );
      } else {
        setMessage(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading1(false);
    }
  };

  const handleStep2 = async () => {
    if (!step1Complete) return;

    setLoading2(true);
    setMessage("Starting cleanup...");

    try {
      const result = await clearImageData();
      if (result.success) {
        setStep2Complete(true);
        setMessage(
          `Successfully cleared base64 data from ${result.clearedCount.toLocaleString()} records`
        );
      } else {
        setMessage(`Cleanup failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading2(false);
    }
  };

  return (
    <div className="flex w-full h-full justify-center items-center">
      <div className="container max-w-3xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>JPEG Storage Migration Tool</CardTitle>
            <CardDescription>
              Migrate base64 image data to filesystem storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Step 1: Convert and Store Images
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Convert base64 image data to files and store file paths in
                  database
                </p>
                <Button
                  onClick={handleStep1}
                  disabled={loading1 || step1Complete}
                  className="w-full"
                >
                  {loading1 ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing JPEGS. This may take a minute...
                    </div>
                  ) : step1Complete ? (
                    "Migration Complete"
                  ) : (
                    "Start Migration"
                  )}
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  Step 2: Delete Base64 Images From Database
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clear base64 data from database after verifying file paths
                  exist
                </p>
                <Button
                  onClick={handleStep2}
                  disabled={loading2 || !step1Complete || step2Complete}
                  className="w-full"
                >
                  {loading2 ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing image_data. This may take a minute...
                    </div>
                  ) : step2Complete ? (
                    "Cleanup Complete"
                  ) : (
                    "Clear Old Data"
                  )}
                </Button>
              </div>

              {message && (
                <div className="mt-4 p-4 rounded bg-muted">
                  <p className="text-sm font-bold">{message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
