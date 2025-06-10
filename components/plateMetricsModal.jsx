import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Image from "next/image";
import { fetchPlateInsights } from "@/actions";

export function formatTimeRange(hour, timeFormat) {
  if (timeFormat === 24) {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}${period}`;
}

export function PlateMetricsModal({
  isOpen,
  onClose,
  plateNumber,
  timeFormat = 12,
}) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (isOpen && plateNumber) {
      const fetchMetrics = async () => {
        const result = await fetchPlateInsights(plateNumber);
        if (result.success) {
          console.log("Received metrics:", result.data);
          console.log("TimeFormat:", timeFormat);
          console.log("Time Distribution:", result.data.timeDistribution);
          setMetrics(result.data);
        }
      };
      fetchMetrics();
    }
  }, [isOpen, plateNumber, timeFormat]);

  if (!isOpen || !metrics) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background shadow-lg p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          Insights for {metrics.plateNumber}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Known Name</dt>
                <dd>{metrics.knownName || "N/A"}</dd>
              </div>
              <div>
                <dt className="font-semibold">First Seen</dt>
                <dd>
                  {new Date(metrics.summary.firstSeen).toLocaleString("en-US", {
                    hour12: timeFormat === 12,
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Last Seen</dt>
                <dd>
                  {new Date(metrics.summary.lastSeen).toLocaleString("en-US", {
                    hour12: timeFormat === 12,
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Total Occurrences</dt>
                <dd>{metrics.summary.totalOccurrences}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.tags.map((tag) => (
                <Badge
                  key={tag.name}
                  style={{ backgroundColor: tag.color, color: "#fff" }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {metrics.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{metrics.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Time Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.timeDistribution.map((item) => ({
                  timeRange: formatTimeRange(item.hour_block, timeFormat),
                  frequency: item.frequency,
                }))}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 50,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timeRange"
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="frequency" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Vehicle Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentReads.map((read, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Image
                        src={`data:image/jpeg;base64,${read.imageData}`}
                        alt={`Vehicle ${index + 1}`}
                        width={100}
                        height={75}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(read.timestamp).toLocaleString("en-US", {
                        hour12: timeFormat === 12,
                      })}
                    </TableCell>
                    <TableCell>{read.vehicleDescription}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

PlateMetricsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  plateNumber: PropTypes.string.isRequired,
  timeFormat: PropTypes.number,
};
