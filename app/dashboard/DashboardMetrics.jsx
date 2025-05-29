"use client";

import { useState, useEffect, Suspense } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { SiGoogledocs } from "react-icons/si";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  TrendingUp,
  Car,
  Eye,
  Calendar,
  Clock,
  Database,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TimeFrameSelector } from "./TimeSelect";
import { TagDistributionChart } from "./TagDistribution";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { FaRoad, FaGithub, FaDocker } from "react-icons/fa";
import CameraReadsChart from "./CameraChart";
import { CameraSelector } from "./CameraSelect";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { getDashboardMetrics, getCameraNames, getTimeFormat } from "@/actions";

export function formatTimeRange(hour, timeFormat) {
  if (timeFormat === 24) {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}${period}`;
}

const PlateImagePreviews = ({ plate, timeFrame }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      try {
        setLoading(true);
        const fetchedImages = await fetchPlateImagePreviews(plate, timeFrame);
        if (mounted) {
          setImages(fetchedImages || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, [plate, timeFrame]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Error loading images
      </div>
    );
  }

  if (!images?.length) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        No recent images available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((img, idx) => (
        <div
          key={idx}
          className="relative aspect-video bg-muted rounded-sm overflow-hidden"
        >
          <Image
            src={
              img.thumbnail_path
                ? `/images/${img.thumbnail_path}`
                : img.image_data
                ? `data:image/jpeg;base64,${img.image_data}`
                : "/placeholder.jpg"
            }
            alt={`Capture from ${new Date(img.timestamp).toLocaleString()}`}
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] bg-black/50 text-white">
            {new Date(img.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

const ClickableBar = ({ payload, x, y, width, height, radius }) => {
  const localHour = payload.hour_block;
  const tzOffset = -(new Date().getTimezoneOffset() / 60);
  const utcFrom = (localHour - tzOffset + 24) % 24;
  const utcTo = (localHour - tzOffset + 24) % 24;

  return (
    <Link
      href={{
        pathname: "/live_feed",
        query: {
          page: 1,
          hourFrom: Math.floor(utcFrom).toString().padStart(2, "0"),
          hourTo: Math.floor(utcTo).toString().padStart(2, "0"),
        },
      }}
    >
      <g>
        <rect
          x={x}
          y={0}
          width={width}
          height={500}
          fill="transparent"
          className="cursor-pointer"
        />
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={radius}
          ry={radius}
          fill="var(--color-frequency)"
          className="hover:opacity-80 transition-opacity pointer-events-none"
        />
      </g>
    </Link>
  );
};

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState({
    time_distribution: [],
    total_plates_count: 0,
    total_reads: 0,
    unique_plates: 0,
    weekly_unique: 0,
    suspicious_count: 0,
    top_plates: [],
  });

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [timeFormat, setTimeFormat] = useState(12);
  const [timeFrame, setTimeFrame] = useState("24h");
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    async function loadCameras() {
      try {
        setCamerasLoading(true);
        const cameraRes = await getCameraNames();
        setCameras(cameraRes.success ? cameraRes.data : []);
      } catch (error) {
        console.error("Error loading cameras:", error);
        setCameras([]);
      } finally {
        setCamerasLoading(false);
      }
    }
    loadCameras();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const endDate = new Date();
        const startDate = new Date();

        switch (timeFrame) {
          case "3d":
            startDate.setDate(endDate.getDate() - 3);
            break;
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "all":
            startDate.setFullYear(2000);
            break;
          default:
            startDate.setDate(endDate.getDate() - 1);
        }

        const cameraName = selectedCamera && selectedCamera !== "all" ? selectedCamera : null;

        const [data, config] = await Promise.all([
          getDashboardMetrics(timeZone, startDate, endDate, cameraName),
          getTimeFormat(),
        ]);

        setTimeFormat(config);

        const sanitizedData = {
          ...data,
          time_distribution: Array.isArray(data?.time_distribution)
            ? data.time_distribution
            : [],
          top_plates: Array.isArray(data?.top_plates) ? data.top_plates : [],
          total_plates_count: Number.parseInt(data?.total_plates_count) || 0,
          total_reads: Number.parseInt(data?.total_reads) || 0,
          unique_plates: Number.parseInt(data?.unique_plates) || 0,
          weekly_unique: Number.parseInt(data?.weekly_unique) || 0,
          suspicious_count: Number.parseInt(data?.suspicious_count) || 0,
        };
        setMetrics(sanitizedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setMetrics({
          time_distribution: [],
          total_plates_count: 0,
          total_reads: 0,
          unique_plates: 0,
          weekly_unique: 0,
          suspicious_count: 0,
          top_plates: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeFrame, selectedCamera]);

  const timeDistributionData = metrics.time_distribution
    .filter((item) => item && typeof item.hour_block === "number")
    .map((item) => ({
      timeRange: formatTimeRange(item.hour_block, timeFormat),
      frequency: Number.parseInt(item.frequency) || 0,
      hour: item.hour_block,
    }))
    .sort((a, b) => a.hour - b.hour);

  const mostActiveTime =
    timeDistributionData.length > 0
      ? timeDistributionData.reduce((max, current) =>
          current.frequency > max.frequency ? current : max
        ).timeRange
      : "No data available";

  // if (loading) {
  //   return (
  //     <div className="space-y-4">
  //       {/* Header - Always shown */}
  //       <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pt-4 gap-4">
  //         <div className="flex flex-col sm:flex-row sm:gap-8 items-center sm:items-baseline mb-2 sm:mb-6">
  //           <h1 className="text-2xl sm:text-3xl font-bold">
  //             License Plate Dashboard
  //           </h1>
  //           <div className="flex gap-4 text-xl mt-2 sm:mt-0">
  //             <Link
  //               href="https://github.com/algertc/ALPR-Database"
  //               target="_blank"
  //               aria-label="GitHub"
  //             >
  //               <FaGithub className="hover:text-blue-500" />
  //             </Link>
  //             <Link
  //               href="https://hub.docker.com/repository/docker/algertc/alpr-dashboard"
  //               target="_blank"
  //               aria-label="Docker"
  //             >
  //               <FaDocker className="hover:text-blue-500" />
  //             </Link>
  //             <Link
  //               href="https://alprdatabase.featurebase.app/roadmap"
  //               target="_blank"
  //               aria-label="Roadmap"
  //             >
  //               <FaRoad className="hover:text-blue-500" />
  //             </Link>
  //           </div>
  //         </div>
  //         <div className="flex items-center gap-2">
  //           <CameraSelector
  //             value={selectedCamera}
  //             onValueChange={setSelectedCamera}
  //             cameras={cameras}
  //             loading={camerasLoading}
  //             disabled={true}
  //           />
  //           <TimeFrameSelector
  //             value={timeFrame}
  //             onValueChange={setTimeFrame}
  //             disabled={true}
  //           />
  //         </div>
  //       </div>

  //       {/* Loading State Content */}
  //       <div className="flex items-center justify-center min-h-[600px]">
  //         <div className="text-center space-y-4">
  //           <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
  //           <div className="space-y-2">
  //             <h3 className="text-lg font-medium text-foreground">
  //               Computing metrics
  //             </h3>
  //             <p className="text-sm text-muted-foreground max-w-sm">
  //               Analyzing license plate data and generating dashboard insights
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="relative space-y-4">
      {/* Header - Made responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pt-4 gap-4">
        <div className="flex flex-col sm:flex-row sm:gap-8 items-center sm:items-baseline mb-2 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">
            License Plate Dashboard
          </h1>
          <div className="flex gap-4 text-xl mt-2 sm:mt-0">
            <Link
              href="https://www.alprdatabase.org/docs"
              target="_blank"
              aria-label="GitHub"
            >
              <SiGoogledocs className="hover:text-blue-500" />
            </Link>
            <Link
              href="https://github.com/algertc/ALPR-Database"
              target="_blank"
              aria-label="GitHub"
            >
              <FaGithub className="hover:text-blue-500" />
            </Link>
            <Link
              href="https://hub.docker.com/repository/docker/algertc/alpr-dashboard"
              target="_blank"
              aria-label="Docker"
            >
              <FaDocker className="hover:text-blue-500" />
            </Link>
            <Link
              href="https://alprdatabase.featurebase.app/roadmap"
              target="_blank"
              aria-label="Roadmap"
            >
              <FaRoad className="hover:text-blue-500" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CameraSelector
            value={selectedCamera}
            onValueChange={setSelectedCamera}
            cameras={cameras}
            loading={camerasLoading}
          />
          <TimeFrameSelector value={timeFrame} onValueChange={setTimeFrame} />
        </div>
      </div>

      {loading && (
        <div className="absolute w-full h-svh dark:bg-black/60  backdrop-blur-md rounded-xl flex flex-col items-center justify-center text-center space-y-4 z-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              Computing metrics
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Querying license plate data and generating dashboard insights.
              This may take a moment.
            </p>
          </div>
        </div>
      )}

      {/* Main charts - Made responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Distribution Chart */}
        <Card className="h-full md:max-h-[600px] 2xl:max-h-[800px] flex flex-col dark:bg-[#0e0e10]">
          <CardHeader>
            <CardTitle>Time Distribution</CardTitle>
            <CardDescription>
              Frequency of plate sightings by time of day ({timeFrame})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px] sm:min-h-[400px] py-0">
            <ChartContainer
              config={{
                frequency: {
                  label: "Frequency",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.time_distribution.map((item) => ({
                    timeRange: formatTimeRange(item.hour_block, timeFormat),
                    frequency: Math.round(parseFloat(item.frequency)) || 0,
                    hour_block: item.hour_block,
                    fullLabel: `${formatTimeRange(
                      item.hour_block,
                      timeFormat
                    )} - ${Math.round(parseFloat(item.frequency))} reads`,
                  }))}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timeRange"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveEnd"
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor="end"
                            fill="currentColor"
                            transform="rotate(-45)"
                            className="text-[10px] sm:text-xs md:text-xs"
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => Math.round(value)}
                    width={30}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Time
                                </span>
                                <span className="font-bold">
                                  {payload[0].payload.timeRange}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Reads
                                </span>
                                <span className="font-bold">
                                  {payload[0].payload.frequency}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="frequency"
                    fill="var(--color-frequency)"
                    radius={4}
                    shape={<ClickableBar />}
                  >
                    <LabelList
                      dataKey="frequency"
                      position="top"
                      className="fill-foreground text-[8px] sm:text-[10px] md:text-xs"
                      formatter={(value) => Math.round(value)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 font-medium leading-none text-xs sm:text-sm">
              Most active time: {mostActiveTime}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground text-xs sm:text-sm">
              Total plate reads by hour over the last {timeFrame}
            </div>
          </CardFooter>
        </Card>

        {/* Top 10 Plates Card */}
        <Card className="max-h-[750px] md:max-h-[600px] 2xl:max-h-[800px] overflow-auto dark:bg-[#0e0e10]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              Top 10 Plates
              <span className="text-sm sm:text-base font-normal text-muted-foreground">
                ({timeFrame})
              </span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Most frequently seen license plates in the last {timeFrame} -
              Hover to preview images
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.top_plates && metrics.top_plates.length > 0 ? (
              <ul className="space-y-3">
                {metrics.top_plates.map((plate, index) => (
                  <li
                    key={plate.plate}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-neutral-100 dark:bg-zinc-900/70 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
                      <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-base sm:text-lg font-bold rounded-full bg-primary/10 text-primary">
                        {index + 1}
                      </span>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                        <HoverCard>
                          <HoverCardTrigger>
                            <div className="space-y-0 sm:space-y-1">
                              <p className="font-semibold text-sm sm:text-base">
                                {plate.plate}
                              </p>
                              {plate.name && (
                                <p className="text-xs sm:text-md font-medium">
                                  {plate.name}
                                </p>
                              )}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-72 sm:w-96 rounded-lg">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-1 text-sm sm:text-base">
                                  Recent Captures Quick Look
                                </h4>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                                  Click the reads count to view all appearances
                                </p>
                                <Suspense
                                  fallback={
                                    <div className="flex items-center justify-center h-32">
                                      <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                  }
                                >
                                  <PlateImagePreviews
                                    plate={plate.plate}
                                    timeFrame={timeFrame}
                                  />
                                </Suspense>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        {plate.tags && plate.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 sm:mt-0">
                            <Separator
                              orientation="vertical"
                              className="hidden sm:block h-10 mx-1 sm:mx-2"
                            />
                            <div className="flex flex-wrap gap-1">
                              {plate.tags.map((tag) => (
                                <Badge
                                  key={tag.name}
                                  style={{
                                    backgroundColor: tag.color,
                                    color: "white",
                                    textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                  }}
                                  className="text-[10px] sm:text-xs h-fit"
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      href={{
                        pathname: "/live_feed",
                        query: { search: plate.plate },
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="group w-full sm:w-auto mt-1 sm:mt-0"
                      >
                        <span className="mr-2 text-xs sm:text-sm">
                          {plate.count} reads
                        </span>
                        <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center xl:py-12 px-4 text-center">
                <div className="relative mb-6">
                  <Image className="w-12 h-12 dark:invert" src="/alpr_icon.svg" alt="ALPR icon" width={12} height={12}/>
                </div>
                <div className="space-y-3 max-w-sm">
                  <h3 className="text-lg font-semibold text-foreground">
                    Waiting for License Plate Data
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dashboard metrics will be computed and appear here once the
                    system begins receiving license plates from Blue Iris.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-md">
                  <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Traffic Insights
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center mb-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Filter by Time
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
                    <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                      <Database className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Track Growth
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-6 px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-full border border-blue-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-700 dark:text-green-200">
                    System Ready
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom section - Made responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Metrics Grid */}
        <div className="xl:col-span-8 grid grid-rows-auto gap-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Total Unique Plates"
              value={metrics.total_plates_count}
              icon={<Database className="h-4 w-4" />}
              description="Total unique plates stored in the database"
              loading={false}
            />
            <MetricCard
              title="Total Reads"
              value={metrics.total_reads}
              icon={<Eye className="h-4 w-4" />}
              description="License plates read during period"
              loading={false}
            />
            <MetricCard
              title="Unique Vehicles"
              value={metrics.unique_plates}
              icon={<Car className="h-4 w-4" />}
              description="Distinct vehicles detected during period"
              loading={false}
            />
            <MetricCard
              title="New Vehicles"
              value={metrics.new_plates_count}
              icon={<Calendar className="h-4 w-4" />}
              description="Vehicles detected for the first time during period"
              loading={false}
            />
          </div>
          <div className="w-full">
            <CameraReadsChart
              data={metrics.camera_counts || []}
              loading={false}
            />
          </div>
        </div>

        {/* Tag Distribution Chart */}
        <div className="xl:col-span-4">
          <TagDistributionChart
            data={metrics.tag_stats || []}
            loading={false}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, description, loading }) {
  return (
    <Card className="dark:bg-[#0e0e10]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-lg sm:text-2xl font-bold">
            {value?.toLocaleString()}
          </div>
        )}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
