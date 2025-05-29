"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Tag,
  Camera,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  Car,
  BarChart3,
} from "lucide-react";
import { getLatestPlateReads, fetchPlateInsights } from "@/actions";

export default function LiveRecognitionViewer({
  latestPlate: initialPlate,
  tags,
  timeFormat,
  biHost,
}) {
  const [latestPlate, setLatestPlate] = useState(initialPlate);
  const [plateInsights, setPlateInsights] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  const router = useRouter();
  const refreshTimerRef = useRef(null);

  // Fetch insights when the plate changes
  useEffect(() => {
    if (latestPlate && latestPlate.plate_number) {
      fetchInsightsData(latestPlate.plate_number);
    }
  }, [latestPlate]);

  // Helper function to fetch insights
  const fetchInsightsData = async (plateNumber) => {
    try {
      setIsLoadingInsights(true);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await fetchPlateInsights(plateNumber, timeZone);

      if (result.success) {
        setPlateInsights(result.data);
      }
    } catch (err) {
      console.error("Error fetching plate insights:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Helper function to handle plate reads
  const fetchLatestPlateRead = async () => {
    try {
      setIsRefreshing(true);
      const params = {
        page: 1,
        pageSize: 1,
        sortField: "timestamp",
        sortDirection: "desc",
      };

      const platesRes = await getLatestPlateReads(params);

      if (platesRes.data && platesRes.data.length > 0) {
        const newPlate = platesRes.data[0];

        // Only update if we have a new plate or the component just mounted
        if (!latestPlate || newPlate.id !== latestPlate.id) {
          setLatestPlate(newPlate);
          setLastUpdateTime(new Date());
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching latest plate read:", err);
      setError("Failed to fetch the latest plate recognition");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    // Initial fetch on mount
    if (!latestPlate) {
      fetchLatestPlateRead();
    }

    // Set up interval for auto-refresh
    refreshTimerRef.current = setInterval(() => {
      fetchLatestPlateRead();
    }, refreshInterval);

    // Clean up interval on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval]);

  // Calculate the time since last update
  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diff = Math.floor((now - lastUpdateTime) / 1000); // in seconds

    if (diff < 60) {
      return `${diff} seconds ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)} minutes ago`;
    } else {
      return `${Math.floor(diff / 3600)} hours ago`;
    }
  };

  const formatConfidence = (confidence) => {
    if (confidence === null || confidence === undefined) return "N/A";

    const numericConfidence = Number(confidence);
    if (isNaN(numericConfidence)) return "N/A";

    return `${(numericConfidence * 100).toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: timeFormat === 12,
    });
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchLatestPlateRead();
  };

  // Format "time ago" for first and last seen timestamps
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "N/A";

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months ago`;
    } else {
      return `${Math.floor(diffDays / 365)} years ago`;
    }
  };

  // Format time of day (from hour block)
  function formatTimeRange(hour) {
    if (timeFormat === 24) {
      return `${String(hour).padStart(2, "0")}:00`;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return `${adjustedHour}${period}`;
  }

  // Get the image source
  const getImageSrc = (plate) => {
    if (plate.image_path) return `/images/${plate.image_path}`;
    if (plate.image_data) return `data:image/jpeg;base64,${plate.image_data}`;
    return "/placeholder.jpg";
  };

  if (!latestPlate) {
    return (
      <div className="container py-8">
        <div className="h-96 flex flex-col items-center justify-center bg-muted/10 rounded-lg border">
          <div className="text-2xl font-semibold text-muted-foreground mb-4">
            No Plate Recognitions Yet
          </div>
          <div className="text-muted-foreground">
            Waiting for new recognition events...
          </div>
          <Button
            variant="outline"
            className="mt-6"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header controls */}
      {/* <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Now
          </Button>
          <span className="text-sm text-muted-foreground">
            Updated {getTimeSinceUpdate()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Refresh every:</span>
          <select
            className="px-2 py-1 text-sm border rounded-md bg-background"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={1000}>1 second</option>
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
          </select>
        </div>
      </div> */}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive rounded-md p-4 mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col 2xl:flex-row 2xl:flex-wrap 2xl:gap-6 space-y-6 2xl:space-y-0 2xl:h-full 2xl:w-full">
        {/* Top section: Large image and key plate info */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main image - takes more space */}
          <div className="dark:bg-[#0e0e10] rounded-lg border overflow-hidden">
            <div className="flex justify-center items-center p-4">
              <Image
                src={getImageSrc(latestPlate)}
                alt={`License plate ${latestPlate.plate_number}`}
                width={1000}
                height={800}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  height: "auto",
                  width: "auto",
                }}
                priority
                className="bg-black/5 rounded"
              />
            </div>

            {/* Image controls */}
            <div className="flex justify-between items-center p-3 bg-background/80 backdrop-blur-sm border-t">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {latestPlate.camera_name || "Unknown camera"}
              </div>
              <div className="flex gap-2">
                <Link href={`/live_feed?search=${latestPlate.plate_number}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </Link>
                {biHost && latestPlate.bi_path && (
                  <Button
                    onClick={() =>
                      window.open(
                        `http://${biHost}/${latestPlate.bi_path}`,
                        "_blank"
                      )
                    }
                    variant="secondary"
                    size="sm"
                  >
                    Open in Blue Iris
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Essential plate info - key details with prominence */}
          <div className="flex flex-col gap-4">
            {/* Plate number - largest and most prominent */}
            <div className="bg-background dark:bg-[#0e0e10] rounded-lg border p-5 flex-grow-0">
              <div className="flex justify-between items-start w-80 2xl:w-[22rem]">
                <div>
                  <div className="text-4xl font-mono font-bold tracking-wider">
                    {latestPlate.plate_number}
                  </div>
                  {latestPlate.known_name && (
                    <div className="text-xl font-medium mt-1">
                      {latestPlate.known_name}
                    </div>
                  )}
                </div>
                {latestPlate.flagged && (
                  <Badge variant="destructive" className="text-sm px-3 py-1">
                    FLAGGED
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  {formatTimestamp(latestPlate.timestamp)}
                </div>
                {/* <div className="font-medium">
                  Confidence: {formatConfidence(latestPlate.confidence)}
                </div> */}
              </div>
            </div>

            {/* Cropped plate image - natural size */}
            {latestPlate.crop_coordinates &&
              Array.isArray(latestPlate.crop_coordinates) && (
                <div className="bg-background dark:bg-[#0e0e10] rounded-lg border p-4">
                  <h3 className="text-sm font-medium mb-3">Cropped Plate</h3>
                  <div className="flex items-center justify-center bg-black/5 rounded overflow-hidden p-1">
                    {(() => {
                      // Original crop dimensions
                      const cropWidth =
                        latestPlate.crop_coordinates[2] -
                        latestPlate.crop_coordinates[0];
                      const cropHeight =
                        latestPlate.crop_coordinates[3] -
                        latestPlate.crop_coordinates[1];

                      // Calculate aspect ratio
                      const aspectRatio = cropWidth / cropHeight;

                      // Minimum dimensions (as percentages of container width)
                      const minWidthPercent = 50; // 50% of container width
                      const containerWidth = 80 * 4 - 32; // w-80 = 20rem = 320px, minus padding

                      // Calculate minimum width in pixels (based on container)
                      const minWidth = (containerWidth * minWidthPercent) / 100;

                      // Calculate scaling based on minimum width
                      const scale =
                        cropWidth < minWidth ? minWidth / cropWidth : 1;

                      // Calculate dimensions respecting aspect ratio
                      const finalWidth = Math.round(cropWidth * scale);
                      const finalHeight = Math.round(cropHeight * scale);

                      return (
                        <div className="relative w-full flex justify-center">
                          <div
                            style={{
                              position: "relative",
                              width: `${finalWidth}px`,
                              height: `${finalHeight}px`,
                              maxWidth: "100%",
                              overflow: "hidden",
                            }}
                          >
                            <Image
                              src={getImageSrc(latestPlate)}
                              alt={`License plate ${latestPlate.plate_number}`}
                              style={{
                                position: "absolute",
                                left: `-${
                                  latestPlate.crop_coordinates[0] * scale
                                }px`,
                                top: `-${
                                  latestPlate.crop_coordinates[1] * scale
                                }px`,
                                maxWidth: "none",
                                transform: `scale(${scale})`,
                                transformOrigin: "top left",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            {/* Tags */}
            <div className="bg-background dark:bg-[#0e0e10] rounded-lg border p-4 flex-grow">
              <h3 className="text-sm font-medium flex items-center mb-3">
                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {latestPlate.tags && latestPlate.tags.length > 0 ? (
                  latestPlate.tags.map((tag) => {
                    const tagInfo = tags.find((t) => t.name === tag.name);
                    return (
                      <Badge
                        key={tag.name}
                        style={{
                          backgroundColor: tagInfo?.color || "#6B7280",
                          color: "#ffffff",
                        }}
                        className="px-3 py-1"
                      >
                        {tag.name}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No tags assigned to this vehicle
                  </span>
                )}
              </div>

              {/* Vehicle Description */}
              {latestPlate.vehicle_description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium flex items-center mb-2">
                    <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                    Vehicle Description
                  </h3>
                  <div className="text-sm bg-muted/10 p-3 rounded">
                    {latestPlate.vehicle_description}
                  </div>
                </div>
              )}

              {/* Notes (if any) */}
              {latestPlate.notes && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <div className="text-sm bg-muted/10 p-3 rounded">
                    {latestPlate.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Insights and additional data */}
        {plateInsights && (
          <div className="flex flex-col md:flex-row gap-6 2xl:flex-1">
            {/* Left column: Recent activity */}
            <div className="md:w-full 2xl:h-full ">
              <Card className="bg-background dark:bg-[#0e0e10]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-full overflow-y-auto pr-2">
                    {plateInsights.recentReads?.length > 0 ? (
                      <div className="space-y-4">
                        {plateInsights.recentReads.map((read, index) => (
                          <div
                            key={index}
                            className="flex gap-4 items-center border-b pb-4"
                          >
                            <div className="w-16 h-16 relative shrink-0 bg-muted/20 rounded overflow-hidden">
                              <Image
                                src={
                                  read.thumbnail_path
                                    ? `/images/${read.thumbnail_path}`
                                    : read.imageData
                                    ? `data:image/jpeg;base64,${read.imageData}`
                                    : "/placeholder.jpg"
                                }
                                alt="Plate image"
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-grow">
                              <div className="font-medium">
                                {new Date(read.timestamp).toLocaleString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: timeFormat === 12,
                                  }
                                )}
                              </div>
                              {/* <div className="text-sm text-muted-foreground">
                                {read.camera_name || "Unknown camera"}
                              </div> */}
                              <div className="text-sm text-muted-foreground font-mono">
                                {latestPlate.plate_number}
                              </div>
                            </div>
                            <div className="text-sm whitespace-nowrap text-right">
                              {formatTimeAgo(read.timestamp)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic flex items-center justify-center h-32">
                        No recent activity data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {plateInsights && (
          <div className="w-full flex flex-col 2xl:flex-row gap-6">
            {/* Statistics */}
            <div className="bg-background dark:bg-[#0e0e10] rounded-lg border p-4 w-full">
              <h3 className="text-lg font-medium flex items-center mb-4">
                <BarChart3 className="h-5 w-5 mr-2" />
                Statistics
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Total Reads
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    {plateInsights.summary.totalOccurrences || 0}
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    First Seen
                  </div>
                  <div className="text-lg font-medium mt-1">
                    {formatTimeAgo(plateInsights.summary.firstSeen)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(
                      plateInsights.summary.firstSeen
                    ).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-lg col-span-2">
                  <div className="text-sm text-muted-foreground">
                    Most Active Time
                  </div>
                  <div className="text-lg font-medium flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    {formatTimeRange(plateInsights.mostActiveTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical metadata */}
            <div className="bg-background dark:bg-[#0e0e10] rounded-lg border w-full">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">
                    Recognition Details
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="flex-1">
                    Raw Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    {/* Timestamp */}
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Timestamp
                      </div>
                      <div>{formatTimestamp(latestPlate.timestamp)}</div>
                    </div>

                    {/* Camera */}
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Camera
                      </div>
                      <div>{latestPlate.camera_name || "Unknown"}</div>
                    </div>

                    {/* Recognition ID */}
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Recognition ID
                      </div>
                      <div className="font-mono text-xs">{latestPlate.id}</div>
                    </div>

                    {/* Confidence */}
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Confidence
                      </div>
                      <div>{formatConfidence(latestPlate.confidence)}</div>
                    </div>

                    {/* Processing Time */}
                    {latestPlate.processing_time && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Processing Time
                        </div>
                        <div>{latestPlate.processing_time} ms</div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="p-4">
                  <div className="bg-muted/10 p-3 rounded-md overflow-x-auto max-h-[250px]">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(latestPlate, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
