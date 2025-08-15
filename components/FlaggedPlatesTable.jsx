"use client";

import { useState, useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { addDBPlate } from "@/app/actions";

export function FlaggedPlatesTable({ initialData }) {
  const [data, setData] = useState(initialData);
  const [open, setOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [isPending, startTransition] = useTransition();

  // Update data when initialData prop changes (after revalidation)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedPlate = plateNumber.trim();
    if (!trimmedPlate) return;

    if (trimmedPlate.length > 10) {
      alert("Plate number cannot exceed 10 characters");
      return;
    }

    startTransition(async () => {
      try {
        const result = await addDBPlate(trimmedPlate.toUpperCase(), true);
        if (result.success) {
          setData((prev) => [
            {
              plate_number: trimmedPlate.toUpperCase(),
              tags: [],
            },
            ...prev,
          ]);
          setPlateNumber("");
          setOpen(false);
        }
      } catch (error) {
        console.error("Error adding flagged plate:", error);
      }
    });
  };

  return (
    <>
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

      <div className="flex justify-end items-center mt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Flagged Plate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Flagged Plate</DialogTitle>
              <DialogDescription>
                Add a new plate number to the flagged list for monitoring.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="plate-number">Plate Number</Label>
                  <Input
                    id="plate-number"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    onBlur={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    className="font-mono text-base p-2 h-10 w-full uppercase"
                    placeholder="Enter Plate Number"
                    maxLength={10}
                    disabled={isPending}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !plateNumber.trim()}
                >
                  {isPending ? "Adding..." : "Add Plate"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
