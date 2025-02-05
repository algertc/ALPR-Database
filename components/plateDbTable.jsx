"use client";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Tag,
  Plus,
  Trash2,
  X,
  Calendar,
  TrendingUp,
  Flag,
  ArrowUpRightIcon,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getPlates,
  getTags,
  addKnownPlate,
  tagPlate,
  untagPlate,
  deletePlate,
  fetchPlateInsights,
  alterPlateFlag,
  deletePlateFromDB,
  getTimeFormat,
} from "@/app/actions";
import Image from "next/image";
import Link from "next/link";

const formatDaysAgo = (days) => {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days >= 15) return "15+ days ago";
  return `${days} days ago`;
};

export function formatTimeRange(hour, timeFormat) {
  if (timeFormat === 24) {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}${period}`;
}

const formatTimestamp = (timestamp, timeFormat) => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === 12,
  });
};

const isWithinDateRange = (firstSeenDate, selectedDateRange) => {
  if (
    !selectedDateRange ||
    !Array.isArray(selectedDateRange) ||
    selectedDateRange.length !== 2
  ) {
    return true; // No range filter applied
  }

  const [startDate, endDate] = selectedDateRange.map((date) =>
    formatTimestamp(new Date(date))
  );
  const formattedFirstSeenDate = formatTimestamp(firstSeenDate);

  // Print the formatted dates for debugging
  // console.log("Comparing dates...");
  // console.log("Formatted First Seen Date:", formattedFirstSeenDate);
  // console.log("Formatted Start Date:", startDate);
  // console.log("Formatted End Date:", endDate);

  // Compare formatted date strings lexicographically
  return (
    formattedFirstSeenDate >= startDate && formattedFirstSeenDate <= endDate
  );
};

export default function PlateTable() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [isAddKnownPlateOpen, setIsAddKnownPlateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activePlate, setActivePlate] = useState(null);
  const [newKnownPlate, setNewKnownPlate] = useState({ name: "", notes: "" });
  const [availableTags, setAvailableTags] = useState([]);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [plateInsights, setPlateInsights] = useState(null);
  const [date, setDate] = useState({ from: undefined, to: undefined });

  const [sortConfig, setSortConfig] = useState({
    key: "last_seen_at",
    direction: "desc",
  });
  const [filters, setFilters] = useState({
    search: "",
    tag: "all",
    fuzzySearch: false,
    dateRange: { from: null, to: null },
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [timeFormat, setTimeFormat] = useState(12);

  useEffect(() => {
    const loadData = async () => {
      const result = await getPlates(page, pageSize, sortConfig, {
        search: searchTerm,
        tag: selectedTag,
        dateRange: date,
      });
      if (result.success) {
        setData(result.data);
        setTotalCount(result.pagination.total);
        setPageCount(result.pagination.pageCount);
      }
    };
    loadData();
  }, [page, pageSize, sortConfig, searchTerm, selectedTag, date]);

  useEffect(() => {
    const loadTags = async () => {
      const result = await getTags();
      if (result.success) {
        setAvailableTags(result.data);
      }
    };
    loadTags();
  }, []);

  useEffect(() => {
    const fetchTimeFormat = async () => {
      try {
        const result = await getTimeFormat();
        setTimeFormat(result);
      } catch (error) {
        console.error("Failed to fetch time format:", error);
      }
    };
    fetchTimeFormat();
  }, []);

  // useEffect(() => {
  //   // console.log("Filtering data...");
  //   const filtered = data.filter((plate) => {
  //     const firstSeenDate = new Date(plate.first_seen_at);
  //     const withinDateRange = isWithinDateRange(
  //       firstSeenDate,
  //       selectedDateRange
  //     );
  //     // console.log("Is within date range:", withinDateRange);

  //     return (
  //       withinDateRange &&
  //       (searchTerm === "" ||
  //         plate.plate_number
  //           .toLowerCase()
  //           .includes(searchTerm.toLowerCase())) &&
  //       (selectedTag === "all" ||
  //         plate.tags?.some((tag) => tag.name === selectedTag))
  //     );
  //   });

  //   const sorted = [...filtered].sort((a, b) => {
  //     switch (sortConfig.key) {
  //       case "occurrence_count":
  //         return sortConfig.direction === "asc"
  //           ? a.occurrence_count - b.occurrence_count
  //           : b.occurrence_count - a.occurrence_count;
  //       case "first_seen_at":
  //         return sortConfig.direction === "asc"
  //           ? new Date(a.first_seen_at) - new Date(b.first_seen_at)
  //           : new Date(b.first_seen_at) - new Date(a.first_seen_at);
  //       case "last_seen_at":
  //         return sortConfig.direction === "asc"
  //           ? a.days_since_last_seen - b.days_since_last_seen
  //           : b.days_since_last_seen - a.days_since_last_seen;
  //       case "plate_number":
  //         return sortConfig.direction === "asc"
  //           ? a.plate_number.localeCompare(b.plate_number)
  //           : b.plate_number.localeCompare(a.plate_number);
  //       default:
  //         return 0;
  //     }
  //   });

  //   setFilteredData(sorted);
  // }, [data, searchTerm, selectedTag, selectedDateRange, sortConfig]);

  const formatLastSeen = (timestamp) => {
    if (timeFormat == 24) {
      return new Date(timestamp).toLocaleString("en-GB");
    }
    return new Date(timestamp).toLocaleString("en-US");
  };

  const formatFirstSeen = (timestamp) => {
    if (timeFormat == 24) {
      return new Date(timestamp).toLocaleDateString("en-GB");
    }
    return new Date(timestamp).toLocaleDateString("en-US");
  };

  const requestSort = (key) => {
    setSortConfig((prevConfig) => {
      const newConfig = {
        key,
        direction:
          prevConfig.key === key && prevConfig.direction === "asc"
            ? "desc"
            : "asc",
      };
      return newConfig;
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-2 w-2" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-2 w-2" />
    ) : (
      <ChevronDown className="ml-2 h-2 w-2" />
    );
  };

  const handleAddTag = async (plateNumber, tagName) => {
    try {
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("tagName", tagName);

      const result = await tagPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) => {
            if (plate.plate_number === plateNumber) {
              const newTag = availableTags.find((t) => t.name === tagName);
              return {
                ...plate,
                tags: [...(plate.tags || []), newTag],
              };
            }
            return plate;
          })
        );
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (plateNumber, tagName) => {
    try {
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("tagName", tagName);

      const result = await untagPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) => {
            if (plate.plate_number === plateNumber) {
              return {
                ...plate,
                tags: (plate.tags || []).filter((tag) => tag.name !== tagName),
              };
            }
            return plate;
          })
        );
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleAddKnownPlate = async () => {
    if (!activePlate) return;
    try {
      const formData = new FormData();
      formData.append("plateNumber", activePlate.plate_number);
      formData.append("name", newKnownPlate.name);
      formData.append("notes", newKnownPlate.notes);

      const result = await addKnownPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) =>
            plate.plate_number === activePlate.plate_number
              ? {
                  ...plate,
                  name: newKnownPlate.name,
                  notes: newKnownPlate.notes,
                }
              : plate
          )
        );
        setIsAddKnownPlateOpen(false);
        setNewKnownPlate({ name: "", notes: "" });
      }
    } catch (error) {
      console.error("Failed to add known plate:", error);
    }
  };

  const handleDeleteRecord = async () => {
    if (!activePlate) return;
    try {
      const formData = new FormData();
      formData.append("plateNumber", activePlate.plate_number);

      const result = await deletePlateFromDB(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.filter(
            (plate) => plate.plate_number !== activePlate.plate_number
          )
        );
        setIsDeleteConfirmOpen(false);
      }
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  };

  const handleOpenInsights = async (plateNumber) => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await fetchPlateInsights(plateNumber, timeZone);
      if (result.success) {
        setPlateInsights(result.data);
        setIsInsightsOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch plate insights:", error);
    }
  };

  const handleToggleFlag = async (plateNumber, flagged) => {
    try {
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("flagged", flagged.toString());

      const result = await alterPlateFlag(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) =>
            plate.plate_number === plateNumber ? { ...plate, flagged } : plate
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle plate flag:", error);
    }
  };

  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(pageCount, prev + 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center space-x-2">
        <div className="flex items-center space-x-2">
          <Search className="text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search plates, names, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />

          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex gap-3 items-center">
                  <Filter className=" w-4 h-4" />
                  All tags
                </div>
              </SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag.name} value={tag.name}>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="untagged">
                <div className="flex gap-3 items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#6B7280" }}
                  />
                  Untagged
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDateRange &&
                selectedDateRange[0] &&
                selectedDateRange[1] ? (
                  `${selectedDateRange[0].toDateString()} - ${selectedDateRange[1].toDateString()}`
                ) : (
                  <span>Filter by date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range) => {
                  if (range && range.from) {
                    // Ensure range.to is optional and correctly handled
                    setDate({ from: range.from, to: range.to || undefined });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {selectedDateRange &&
            selectedDateRange[0] &&
            selectedDateRange[1] && (
              <Button
                variant="ghost"
                onClick={() => setSelectedDateRange([null, null])}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear date range</span>
              </Button>
            )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      </div>
      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort("plate_number")}
                  className="h-8 flex items-center font-semibold p-0"
                >
                  Plate Number
                  {getSortIcon("plate_number")}
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort("occurrence_count")}
                  className="h-8 flex items-center font-semibold p-0"
                >
                  Seen
                  {getSortIcon("occurrence_count")}
                </Button>
              </TableHead>
              <TableHead className="w-56 2xl:w-96">Name</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort("first_seen_at")}
                  className="h-8 flex items-center font-semibold p-0"
                >
                  First Seen
                  {getSortIcon("first_seen_at")}
                </Button>
              </TableHead>
              <TableHead className="w-[240px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort("last_seen_at")}
                  className="h-8 flex items-center font-semibold p-0"
                >
                  Last Seen
                  {getSortIcon("last_seen_at")}
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">Tags</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((plate) => (
              <TableRow key={plate.plate_number}>
                <TableCell className="font-mono text-lg font-medium">
                  <span
                    className={`px-2 cursor-pointer transition-colors duration-200
                        ${plate.flagged ? "text-[#F31260]" : "text-primary"}
                        hover:underline`}
                    onClick={() => handleOpenInsights(plate.plate_number)}
                  >
                    {plate.plate_number}
                  </span>
                </TableCell>
                <TableCell>{plate.occurrence_count}</TableCell>
                <TableCell>{plate.name}</TableCell>
                <TableCell>{plate.notes}</TableCell>
                <TableCell>{formatFirstSeen(plate.first_seen_at)}</TableCell>
                <TableCell>{formatLastSeen(plate.last_seen_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {plate.tags?.length > 0 ? (
                      plate.tags.map((tag) => (
                        <Badge
                          key={tag.name}
                          variant="secondary"
                          className="text-xs py-0.5 pl-2 pr-1 flex items-center space-x-1"
                          style={{ backgroundColor: tag.color, color: "#fff" }}
                        >
                          <span>{tag.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white rounded-full"
                            onClick={() =>
                              handleRemoveTag(plate.plate_number, tag.name)
                            }
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">
                              Remove {tag.name} tag
                            </span>
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No tags
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Tag className="h-4 w-4" />
                          <span className="sr-only">Add tag</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {availableTags.map((tag) => (
                          <DropdownMenuItem
                            key={tag.name}
                            onClick={() =>
                              handleAddTag(plate.plate_number, tag.name)
                            }
                          >
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setActivePlate(plate);
                        setIsAddKnownPlateOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add to known plates</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={
                        plate.flagged ? "text-red-500 hover:text-red-700" : ""
                      }
                      onClick={() =>
                        handleToggleFlag(plate.plate_number, !plate.flagged)
                      }
                    >
                      <Flag
                        className={`h-4 w-4 ${
                          plate.flagged ? "fill-current" : ""
                        }`}
                      />
                      <span className="sr-only">
                        {plate.flagged ? "Remove flag" : "Add flag"}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setActivePlate(plate);
                        setIsDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete record</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between ">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, totalCount)} of {totalCount} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isAddKnownPlateOpen} onOpenChange={setIsAddKnownPlateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Known Plates</DialogTitle>
            <DialogDescription>
              Add details for the plate {activePlate?.plate_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newKnownPlate.name}
                onChange={(e) =>
                  setNewKnownPlate({ ...newKnownPlate, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={newKnownPlate.notes}
                onChange={(e) =>
                  setNewKnownPlate({ ...newKnownPlate, notes: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddKnownPlate}>
              Add to Known Plates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecord}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
        <SheetContent
          side="right"
          className="w-[900px] sm:max-w-[900px] lg:max-w-[1200px] overflow-y-auto"
        >
          <SheetHeader>
            <Link
              href={`/live_feed?search=${plateInsights?.plateNumber}`}
              passHref
            >
              <SheetTitle>Insights for {plateInsights?.plateNumber}</SheetTitle>
            </Link>
            <SheetDescription>
              Detailed information about this plate
            </SheetDescription>
          </SheetHeader>
          {plateInsights && (
            <ScrollArea className="h-[calc(100vh-120px)] pr-4">
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Name
                    </h3>
                    <p className="mt-1 text-sm">
                      {plateInsights.knownName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      # Times Seen
                    </h3>
                    <p className="mt-1 text-sm">
                      {plateInsights.summary.totalOccurrences || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      First Seen
                    </h3>
                    <p className="mt-1 text-sm">
                      {new Date(
                        plateInsights.summary.firstSeen
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Seen
                    </h3>
                    <p className="mt-1 text-sm">
                      {new Date(
                        plateInsights.summary.lastSeen
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Notes
                  </h3>
                  <p className="mt-1 text-sm">
                    {plateInsights.notes || "No notes available"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tags
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {plateInsights.tags.map((tag) => (
                      <Badge
                        key={tag.name}
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Time Distribution</CardTitle>
                    <CardDescription>
                      Frequency of plate sightings by time of day
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        frequency: {
                          label: "Frequency",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                    >
                      <BarChart
                        data={plateInsights.timeDistribution.map((item) => ({
                          timeRange: formatTimeRange(
                            item.hour_block,
                            timeFormat
                          ),
                          frequency: item.frequency,
                        }))}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 30,
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
                          height={70}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                          dataKey="frequency"
                          fill="var(--color-frequency)"
                          radius={4}
                        >
                          <LabelList
                            dataKey="frequency"
                            position="top"
                            className="fill-foreground"
                            fontSize={12}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                      Most active time:{" "}
                      {formatTimeRange(plateInsights.mostActiveTime)}
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                      Showing frequency of sightings across 24 hours
                    </div>
                  </CardFooter>
                </Card>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Reads</h3>
                    <Link
                      href={`/live_feed?search=${plateInsights.plateNumber}`}
                      passHref
                    >
                      <Button variant="outline" size="sm" asChild>
                        <span className="flex items-center gap-2">
                          View All
                          <ArrowUpRightIcon className="h-4 w-4" />
                        </span>
                      </Button>
                    </Link>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Vehicle Description</TableHead>
                        <TableHead>Image</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plateInsights.recentReads.map((read, index) => (
                        <TableRow key={index}>
                          <TableCell className="whitespace-nowrap">
                            {formatTimestamp(read.timestamp, timeFormat)}
                          </TableCell>
                          <TableCell>{read.vehicleDescription}</TableCell>
                          <TableCell>
                            <Image
                              src={
                                read.thumbnail_path
                                  ? `/images/${read.thumbnail_path}`
                                  : read.imageData
                                  ? `data:image/jpeg;base64,${read.imageData}`
                                  : "/placeholder.jpg"
                              }
                              alt="Vehicle"
                              className="object-cover rounded"
                              width={80}
                              height={60}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
