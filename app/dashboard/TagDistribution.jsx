import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, Label, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export function TagDistributionChart({ data, loading }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate responsive chart dimensions
  const getChartDimensions = () => {
    if (windowWidth < 640) {
      // Mobile
      return {
        innerRadius: 60,
        outerRadius: 80,
        labelY: 20, // Smaller offset for the label
        fontSize: "text-2xl", // Smaller font for total
        subtextSize: "text-xs", // Smaller subtext
      };
    } else {
      return {
        innerRadius: 80,
        outerRadius: 110,
        labelY: 30, // Original offset
        fontSize: "text-3xl", // Original font size
        subtextSize: "text-sm", // Original subtext size
      };
    }
  };

  const { innerRadius, outerRadius, labelY, fontSize, subtextSize } =
    getChartDimensions();

  const chartConfig = {
    tag: {
      label: "Tag Distribution",
      color: "var(--chart-1)",
    },
  };

  return (
    <Card className="dark:bg-[#0e0e10] h-full rounded-lg">
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-xl sm:text-2xl">Tag Distribution</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Distribution of plate tags in the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0 sm:pt-4">
        {loading ? (
          <Skeleton className="mx-auto aspect-square h-[200px] sm:h-[300px]" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[200px] sm:max-h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-md border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Category
                              </span>
                              <span className="font-bold">{data.category}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Count
                              </span>
                              <span className="font-bold">{data.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={entry.color || `var(--chart-${(index % 12) + 1})`}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className={`fill-foreground font-bold ${fontSize}`}
                        >
                          {total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy + labelY}
                          className={`fill-muted-foreground ${subtextSize}`}
                        >
                          Tagged Vehicles
                        </tspan>
                      </text>
                    )}
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
        <div className="mt-2 sm:mt-4 space-y-1 text-[10px] sm:text-sm">
          {data.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className="h-2 w-2 sm:h-3 sm:w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.category}</span>
              </div>
              <span className="font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
