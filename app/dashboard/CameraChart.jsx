"use client";

import { Camera } from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
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
import { ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

// Generate colors for the bars
const generateColors = (count) => {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(220 70% 50%)",
    "hsl(120 70% 50%)",
    "hsl(340 70% 50%)",
  ];

  return Array(count)
    .fill()
    .map((_, i) => colors[i % colors.length]);
};

export function CameraReadsChart({ data, loading }) {
  // Process and limit data to top 6 cameras
  const chartData = [...(data || [])]
    .sort((a, b) => b.read_count - a.read_count)
    .slice(0, 6)
    .map((item) => ({
      camera: item.camera,
      reads: item.read_count,
    }));

  const colors = generateColors(chartData.length);

  const mostActiveCamera =
    chartData.length > 0 ? chartData[0].camera : "No data available";

  return (
    <Card className="dark:bg-[#0e0e10] h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Camera Activity</CardTitle>
        <CardDescription className="text-xs">
          Plate reads by camera {data?.length > 6 ? `(Top 6)` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        {loading ? (
          <Skeleton className="w-full h-40" />
        ) : (
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 25,
                  right: 25,
                  left: 0,
                  bottom: 25,
                }}
                barGap={4}
              >
                <CartesianGrid vertical={false} strokeWidth={0.25} />
                <XAxis
                  dataKey="camera"
                  tickLine={false}
                  axisLine={false}
                  height={25}
                  tickMargin={5}
                  tick={{ fontSize: 14 }}
                  textAnchor="middle"
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => Math.round(value)}
                  width={36}
                  tick={{ fontSize: 13 }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-md border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Camera
                              </span>
                              <span className="font-bold">
                                {payload[0].payload.camera}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Reads
                              </span>
                              <span className="font-bold">
                                {payload[0].payload.reads}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="reads" radius={4} barSize={42}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                  <LabelList
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs pt-2">
        <div className="flex gap-2 font-medium leading-none items-center">
          Most Active: {mostActiveCamera}
          <Camera className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
}

export default CameraReadsChart;
