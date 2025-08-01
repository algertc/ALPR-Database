"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function FlaggedPlatesTable({ initialData }) {
  const [data] = useState(initialData);

  return (
    <Card className="mt-4 sm:mt-0 dark:bg-[#0e0e10]">
      <CardContent className="py-4 ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  No flagged plates found
                </TableCell>
              </TableRow>
            ) : (
              data.map((plate) => (
                <TableRow key={plate.plate_number}>
                  <TableCell className="font-medium font-mono text-[#F31260]">
                    {plate.plate_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {plate.tags?.length > 0 ? (
                        plate.tags.map((tag) => (
                          <Badge
                            key={tag.name}
                            variant="secondary"
                            className="text-xs py-0.5 px-2"
                            style={{
                              backgroundColor: tag.color,
                              color: "#fff",
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No tags
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
