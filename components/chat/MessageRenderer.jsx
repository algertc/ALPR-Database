"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  AreaChart,
  Area,
} from "recharts";
import {
  Copy,
  ExternalLink,
  FileText,
  BarChart3,
  Tag,
  Image as ImageIcon,
  Calendar,
  Clock,
  Car,
  MapPin,
  AlertCircle,
  TrendingUp,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

// Custom markdown components
const markdownComponents = {
  pre: ({ children, ...props }) => (
    <div className="relative group">
      <pre
        className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono border border-slate-200 dark:border-slate-700"
        {...props}
      >
        {children}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-100"
        onClick={() => {
          const text = children?.props?.children || "";
          navigator.clipboard.writeText(text);
        }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  ),

  code: ({ children, className, ...props }) => {
    const isInline = !className?.includes("language-");
    return isInline ? (
      <code
        className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-sm font-mono border"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg"
        {...props}
      >
        {children}
      </table>
    </div>
  ),

  thead: ({ children, ...props }) => (
    <thead className="bg-slate-50 dark:bg-slate-800" {...props}>
      {children}
    </thead>
  ),

  th: ({ children, ...props }) => (
    <th
      className="px-4 py-2 text-left font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700"
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      className="px-4 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
      {...props}
    >
      {children}
    </td>
  ),

  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside space-y-1 my-2" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside space-y-1 my-2" {...props}>
      {children}
    </ol>
  ),

  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-4 my-4 italic text-slate-600 dark:text-slate-400"
      {...props}
    >
      {children}
    </blockquote>
  ),

  h1: ({ children, ...props }) => (
    <h1
      className="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-slate-100"
      {...props}
    >
      {children}
    </h1>
  ),

  h2: ({ children, ...props }) => (
    <h2
      className="text-lg font-semibold mt-5 mb-2 text-slate-900 dark:text-slate-100"
      {...props}
    >
      {children}
    </h2>
  ),

  h3: ({ children, ...props }) => (
    <h3
      className="text-base font-medium mt-4 mb-2 text-slate-900 dark:text-slate-100"
      {...props}
    >
      {children}
    </h3>
  ),

  p: ({ children, ...props }) => (
    <p className="my-2 leading-relaxed" {...props}>
      {children}
    </p>
  ),

  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  ),
};

function StructuredContent({ data }) {
  // Move hooks to the top level - always called
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { getTags } = await import("@/app/actions");
        const result = await getTags();
        if (result.success) {
          setAvailableTags(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    // Only fetch tags if we have known_plates data that needs tags
    if (data.type === "known_plates" && data.plates) {
      fetchTags();
    }
  }, [data.type, data.plates]);

  if (!data || typeof data !== "object") {
    return null;
  }

  // Chart Component using proper shadcn/ui patterns
  if (data.type === "chart") {
    const chartConfig = {};

    // Build chart config properly
    data.yAxisKeys?.forEach((key, index) => {
      chartConfig[key] = {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: data.colors?.[index] || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });

    const renderChart = () => {
      switch (data.chartType) {
        case "scatter":
          return (
            <LineChart accessibilityLayer data={data.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={data.xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  // Handle date formatting
                  if (
                    data.xAxisKey === "date" ||
                    data.xAxisKey === "timestamp"
                  ) {
                    return new Date(value).toLocaleDateString();
                  }
                  return value;
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={["dataMin - 0.1", "dataMax + 0.1"]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      if (
                        data.xAxisKey === "date" ||
                        data.xAxisKey === "timestamp"
                      ) {
                        return new Date(value).toLocaleDateString();
                      }
                      return value;
                    }}
                  />
                }
              />
              {data.yAxisKeys.map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={{ fill: `var(--color-${key})`, strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          );

        case "line":
          return (
            <LineChart accessibilityLayer data={data.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={data.xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (
                    data.xAxisKey === "date" ||
                    data.xAxisKey === "timestamp"
                  ) {
                    return new Date(value).toLocaleDateString();
                  }
                  return value;
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {data.yAxisKeys.map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          );

        case "area":
          return (
            <AreaChart accessibilityLayer data={data.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={data.xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (
                    data.xAxisKey === "date" ||
                    data.xAxisKey === "timestamp"
                  ) {
                    return new Date(value).toLocaleDateString();
                  }
                  return value;
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {data.yAxisKeys.map((key, index) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="monotone"
                  fill={`var(--color-${key})`}
                  fillOpacity={0.4}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  stackId={data.stacked ? "1" : key}
                />
              ))}
            </AreaChart>
          );

        case "bar":
          return (
            <BarChart accessibilityLayer data={data.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={data.xAxisKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  if (
                    data.xAxisKey === "date" ||
                    data.xAxisKey === "timestamp"
                  ) {
                    return new Date(value).toLocaleDateString();
                  }
                  return value;
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {data.yAxisKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={4}
                />
              ))}
            </BarChart>
          );

        case "pie":
          return (
            <div className="flex justify-center">
              <PieChart width={400} height={300}>
                <Pie
                  data={data.data}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={data.yAxisKeys?.[0] || "value"}
                  nameKey={data.xAxisKey || "name"}
                >
                  {data.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.color ||
                        data.colors?.[index] ||
                        `hsl(var(--chart-${(index % 5) + 1}))`
                      }
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </div>
          );

        default:
          return (
            <BarChart accessibilityLayer data={data.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={data.xAxisKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {data.yAxisKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={4}
                />
              ))}
            </BarChart>
          );
      }
    };

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {data.title || "Chart"}
          </CardTitle>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={`min-h-[${data.height || 200}px] w-full`}
          >
            {renderChart()}
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  // Metrics Dashboard Component
  if (data.type === "metrics" && data.metrics) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {data.title || "Metrics Dashboard"}
          </CardTitle>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
          {data.timeframe && (
            <p className="text-xs text-muted-foreground">{data.timeframe}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {metric.label}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {metric.value}
                  </div>
                  {metric.change && (
                    <div
                      className={`text-sm font-medium ${
                        metric.changeType === "positive" ||
                        metric.change.startsWith("+")
                          ? "text-green-600 dark:text-green-400"
                          : metric.changeType === "negative" ||
                            metric.change.startsWith("-")
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {metric.change}
                    </div>
                  )}
                </div>
                {metric.subtitle && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {metric.subtitle}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Table Component
  if (data.type === "table" && data.columns && data.data) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {data.title || "Data Table"}
          </CardTitle>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {data.columns.map((column, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-2 text-left font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700"
                    >
                      {typeof column === "object" ? column.label : column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {data.columns.map((column, colIdx) => {
                      const columnKey =
                        typeof column === "object" ? column.key : column;
                      const columnType =
                        typeof column === "object" ? column.type : "text";
                      const columnName =
                        typeof column === "object" ? column.label : column;
                      return (
                        <td
                          key={colIdx}
                          className="px-4 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
                        >
                          {formatTableCell(
                            row[columnKey],
                            columnName,
                            columnType
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing{" "}
                {(data.pagination.page - 1) * data.pagination.pageSize + 1} to{" "}
                {Math.min(
                  data.pagination.page * data.pagination.pageSize,
                  data.pagination.total
                )}{" "}
                of {data.pagination.total} results
              </div>
              <div>
                Page {data.pagination.page} of{" "}
                {Math.ceil(data.pagination.total / data.pagination.pageSize)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Known Plates Component
  if (data.type === "known_plates" && data.plates) {
    return (
      <div className="space-y-3 mt-4">
        {data.title && <h3 className="text-lg font-semibold">{data.title}</h3>}
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
        {data.plates.map((plate, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-2xl font-mono font-bold tracking-tight">
                      {plate.plate_number}
                    </span>
                    {plate.name && (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {plate.name}
                      </span>
                    )}
                    {(plate.vehicle_make || plate.vehicle_model) && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {plate.vehicle_make} {plate.vehicle_model}
                      </span>
                    )}
                    {plate.description && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {plate.description}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {plate.tag ? (
                      (() => {
                        const tagInfo = availableTags.find(
                          (t) => t.name === plate.tag
                        );
                        if (!tagInfo) {
                          return (
                            <Badge
                              key={plate.tag}
                              variant="secondary"
                              className="text-xs py-0.5 px-2"
                            >
                              {plate.tag}
                            </Badge>
                          );
                        }

                        return (
                          <Badge
                            key={plate.tag}
                            variant="secondary"
                            className="text-xs py-0.5 px-2"
                            style={{
                              backgroundColor: tagInfo.color,
                              color: "#fff",
                            }}
                          >
                            {plate.tag}
                          </Badge>
                        );
                      })()
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No tags
                      </div>
                    )}
                    {plate.status && (
                      <Badge
                        variant={
                          plate.status === "active"
                            ? "default"
                            : plate.status === "flagged"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs py-0.5 px-2"
                      >
                        {plate.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {plate.first_seen && (
                    <div className="text-right">
                      <div className="text-sm font-medium">First Seen</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(plate.first_seen).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {plate.last_seen && (
                    <div className="text-right">
                      <div className="text-sm font-medium">Last Seen</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(plate.last_seen).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {plate.detection_count !== undefined && (
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Total Detections
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {plate.detection_count || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Images Component
  if (data.type === "images" && data.images) {
    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-lg font-semibold">{data.title}</h3>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.images.map((image, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  <Image
                    src={`/images/${image.image_path}`}
                    alt={image.caption || "Detection image"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3 space-y-1">
                  {image.caption && (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {image.caption}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3" />
                    {image.timestamp &&
                      new Date(image.timestamp).toLocaleString()}
                  </div>
                  {image.plate_number && (
                    <div className="text-xs text-slate-500">
                      Plate: {image.plate_number}
                    </div>
                  )}
                  {image.camera_name && (
                    <div className="text-xs text-slate-500">
                      Camera: {image.camera_name}
                    </div>
                  )}
                  {image.confidence && (
                    <div className="text-xs text-slate-500">
                      Confidence: {(image.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Timeline Component
  if (data.type === "timeline" && data.events) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {data.title || "Timeline"}
          </CardTitle>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.events.map((event, idx) => (
              <div key={event.id || idx} className="flex gap-3 items-start">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    event.type === "detection"
                      ? "bg-blue-500"
                      : event.type === "alert"
                      ? "bg-red-500"
                      : event.type === "system"
                      ? "bg-gray-500"
                      : event.type === "user"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  )}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {event.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                  {event.description && (
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {event.description}
                    </div>
                  )}
                  {event.plate_number && (
                    <div className="text-xs text-slate-500 mt-1">
                      Plate: {event.plate_number}
                    </div>
                  )}
                  {event.camera_name && (
                    <div className="text-xs text-slate-500">
                      Camera: {event.camera_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Alerts Component
  if (data.type === "alerts" && data.alerts) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {data.title || "Alerts"}
          </CardTitle>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.alerts.map((alert, idx) => (
              <div
                key={alert.id || idx}
                className={cn(
                  "p-3 rounded-lg border",
                  alert.level === "error" || alert.level === "critical"
                    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    : alert.level === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.level === "error" || alert.level === "critical" ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : alert.level === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {alert.message}
                      </div>
                      {alert.plate_number && (
                        <div className="text-xs text-slate-500 mt-1">
                          Plate: {alert.plate_number}
                        </div>
                      )}
                      {alert.camera_name && (
                        <div className="text-xs text-slate-500">
                          Camera: {alert.camera_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 ml-4">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                    {alert.acknowledged && (
                      <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                        <CheckCircle className="h-3 w-3" />
                        Acknowledged
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Helper function to format table cell values
function formatTableCell(value, column, type = "text") {
  if (value === null || value === undefined) return "-";

  // Handle different column types
  switch (type) {
    case "date":
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }

    case "number":
      if (typeof value === "number") {
        return value.toLocaleString();
      }
      return value;

    case "badge":
      if (typeof value === "string" && value.endsWith("%")) {
        return (
          <Badge
            variant={
              parseFloat(value) > 90
                ? "default"
                : parseFloat(value) > 70
                ? "secondary"
                : "destructive"
            }
          >
            {value}
          </Badge>
        );
      }
      return <Badge variant="secondary">{value}</Badge>;

    case "text":
    default:
      // Auto-detect date/time columns
      if (
        column.toLowerCase().includes("date") ||
        column.toLowerCase().includes("time") ||
        column.toLowerCase().includes("seen")
      ) {
        try {
          return new Date(value).toLocaleString();
        } catch {
          return value;
        }
      }

      // Auto-detect numbers
      if (typeof value === "number") {
        return value.toLocaleString();
      }

      // Auto-detect percentages
      if (typeof value === "string" && value.endsWith("%")) {
        return (
          <Badge
            variant={
              parseFloat(value) > 90
                ? "default"
                : parseFloat(value) > 70
                ? "secondary"
                : "destructive"
            }
          >
            {value}
          </Badge>
        );
      }

      return value;
  }
}

// Function to extract and parse structured data from message text
function extractStructuredData(text) {
  const structuredItems = [];
  let cleanedText = text;

  try {
    // First, handle markdown code blocks with json
    const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
    let match;

    // Extract JSON from code blocks
    while ((match = codeBlockRegex.exec(text)) !== null) {
      try {
        const jsonText = match[1];
        const data = JSON.parse(jsonText);
        // Check if it's a valid structured data type
        if (
          data.type &&
          [
            "chart",
            "metrics",
            "table",
            "timeline",
            "alerts",
            "known_plates",
            "images",
          ].includes(data.type)
        ) {
          structuredItems.push(data);
          // Remove the entire code block from the text
          cleanedText = cleanedText.replace(match[0], "").trim();
        }
      } catch (e) {
        // Skip invalid JSON - leave it in the text for markdown rendering
        continue;
      }
    }

    // Handle raw JSON objects - find all potential JSON objects
    function findJsonObjects(str) {
      const jsonObjects = [];
      let braceCount = 0;
      let start = -1;

      for (let i = 0; i < str.length; i++) {
        if (str[i] === "{") {
          if (braceCount === 0) {
            start = i;
          }
          braceCount++;
        } else if (str[i] === "}") {
          braceCount--;
          if (braceCount === 0 && start !== -1) {
            const jsonCandidate = str.substring(start, i + 1);
            try {
              const parsed = JSON.parse(jsonCandidate);
              if (
                parsed.type &&
                [
                  "chart",
                  "metrics",
                  "table",
                  "timeline",
                  "alerts",
                  "known_plates",
                  "images",
                ].includes(parsed.type)
              ) {
                jsonObjects.push({
                  json: jsonCandidate,
                  data: parsed,
                  start: start,
                  end: i + 1,
                });
              }
            } catch (e) {
              // Not valid JSON, continue
            }
            start = -1;
          }
        }
      }
      return jsonObjects;
    }

    // Find and extract JSON objects from the cleaned text
    const jsonObjects = findJsonObjects(cleanedText);

    // Sort by start position in reverse order so we can remove from end to beginning
    jsonObjects.sort((a, b) => b.start - a.start);

    for (const obj of jsonObjects) {
      structuredItems.push(obj.data);
      // Remove the JSON from the text
      cleanedText =
        cleanedText.substring(0, obj.start) + cleanedText.substring(obj.end);
    }
  } catch (e) {
    console.error("Error extracting structured data:", e);
  }

  // Clean up any extra whitespace or empty lines
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

  return {
    structuredData: structuredItems.length > 0 ? structuredItems : null,
    cleanedText: cleanedText,
  };
}

export function MessageRenderer({ message, className = "" }) {
  // Extract structured data and clean the text
  const { structuredData, cleanedText } = extractStructuredData(message.text);

  // Use extracted structured data or fall back to message.structured
  const finalStructuredData = structuredData || message.structured;

  const hasStructuredContent =
    finalStructuredData &&
    (Array.isArray(finalStructuredData)
      ? finalStructuredData.length > 0
      : finalStructuredData.type);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main message content with markdown support - using cleaned text */}
      {cleanedText && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
          >
            {cleanedText}
          </ReactMarkdown>
        </div>
      )}

      {/* Structured content */}
      {hasStructuredContent && (
        <div className="space-y-4">
          {Array.isArray(finalStructuredData) ? (
            // Handle multiple structured data objects
            finalStructuredData.map((structuredItem, index) => (
              <StructuredContent key={index} data={structuredItem} />
            ))
          ) : (
            // Handle single structured data object
            <StructuredContent data={finalStructuredData} />
          )}
        </div>
      )}
    </div>
  );
}
