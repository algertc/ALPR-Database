"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader2,
  Database,
  Image,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { BackfillButton } from "./BackfillButton";
import {
  migrateImageDataToFiles,
  clearImageData,
  completeUpdate,
  skipImageMigration,
} from "@/actions";
import { useRouter } from "next/navigation";

export default function SystemUpdatePage() {
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [step3Complete, setStep3Complete] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const router = useRouter();

  const handleImageMigration = async () => {
    if (!step1Complete) return;

    setLoading2(true);
    setMessage("Starting image migration...");
    setMessageType("info");

    try {
      const result = await migrateImageDataToFiles();
      if (result.success) {
        setStep2Complete(true);
        setMessage(
          `Successfully migrated ${result.processed.toLocaleString()} of ${result.totalRecords.toLocaleString()} remaining records`
        );
        setMessageType("success");
      } else {
        setMessage(`Migration failed: ${result.error}`);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading2(false);
    }
  };

  const handleCleanup = async () => {
    if (!step2Complete) return;

    setLoading3(true);
    setMessage("Starting cleanup...");
    setMessageType("info");

    try {
      const result = await clearImageData();
      if (result.success) {
        setStep3Complete(true);
        setMessage(
          `Successfully cleared base64 data from ${result.clearedCount.toLocaleString()} records`
        );
        setMessageType("success");
        await completeUpdate();
      } else {
        setMessage(`Cleanup failed: ${result.error}`);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading3(false);
    }
  };

  const totalSteps = 3;
  const completedSteps = [step1Complete, step2Complete, step3Complete].filter(
    Boolean
  ).length;
  const progress = (completedSteps / totalSteps) * 100;

  const handleSkipMigration = async () => {
    setMessage("Verifying migration status...");
    setMessageType("info");

    try {
      const result = await skipImageMigration();
      if (result.success) {
        setStep1Complete(true);
        setStep2Complete(true);
        setStep3Complete(true);
        setMessage("Migration verified and marked as complete");
        setMessageType("success");

        // Brief delay to show the success message before redirect
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setMessage(result.error);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setMessageType("error");
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-center">
      <Card className="mt-8 text-center p-8 max-w-4xl mx-auto">
        <p className="text-lg font-semibold mb-4">
          Just installed for the first time or already completed the image
          storage migration?
        </p>
        <Button
          variant="outline"
          onClick={handleSkipMigration}
          disabled={step3Complete}
        >
          Verify and Skip Migration
        </Button>
      </Card>
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">
              System Update Required
            </CardTitle>
            <CardDescription className="text-center text-lg">
              If you are updating your existing deployment, please complete the
              following steps:
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="space-y-8">
              <div className="relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500 ease-in-out"
                  ></div>
                </div>
              </div>

              <div className="space-y-6">
                <StepItem
                  step={1}
                  title="Database Backfill"
                  description="Update occurrence counts in the plates table"
                  icon={<Database className="h-6 w-6" />}
                  isComplete={step1Complete}
                >
                  <BackfillButton onComplete={() => setStep1Complete(true)} />
                </StepItem>

                <StepItem
                  step={2}
                  title="Image Migration"
                  description="Convert base64 image data to files and store file paths in database"
                  icon={<Image className="h-6 w-6" alt="Image Migration" width={6} height={6}/>}
                  isComplete={step2Complete}
                  isDisabled={!step1Complete}
                >
                  <Button
                    onClick={handleImageMigration}
                    disabled={loading2 || !step1Complete || step2Complete}
                    className="w-full"
                  >
                    {loading2 ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Images...
                      </div>
                    ) : step2Complete ? (
                      "Migration Complete"
                    ) : (
                      "Start Migration"
                    )}
                  </Button>
                </StepItem>

                <StepItem
                  step={3}
                  title="Cleanup Old Data"
                  description="Clear base64 data from database after verifying file paths exist"
                  icon={<Trash2 className="h-6 w-6" />}
                  isComplete={step3Complete}
                  isDisabled={!step2Complete}
                >
                  <Button
                    onClick={handleCleanup}
                    disabled={loading3 || !step2Complete || step3Complete}
                    className="w-full"
                  >
                    {loading3 ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cleaning up...
                      </div>
                    ) : step3Complete ? (
                      "Cleanup Complete"
                    ) : (
                      "Start Cleanup"
                    )}
                  </Button>
                </StepItem>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {message && (
              <div
                className={`w-full p-4 rounded ${
                  messageType === "error"
                    ? "bg-red-100 text-red-800"
                    : messageType === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                } transition-all duration-300 ease-in-out`}
              >
                <div className="flex items-center">
                  {messageType === "error" && (
                    <AlertCircle className="h-5 w-5 mr-2" />
                  )}
                  {messageType === "success" && (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function StepItem({
  step,
  title,
  description,
  icon,
  isComplete,
  isDisabled,
  children,
}) {
  return (
    <div
      className={`flex items-start space-x-4 ${isDisabled ? "opacity-50" : ""}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isComplete ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {isComplete ? <CheckCircle className="h-5 w-5" /> : <span>{step}</span>}
      </div>
      <div className="flex-grow">
        <h3 className="text-lg font-medium flex items-center mb-1">
          {icon}
          <span className="ml-2">{title}</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {children}
      </div>
    </div>
  );
}
