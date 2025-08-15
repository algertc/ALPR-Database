"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import {
  Search,
  Filter,
  Tag,
  Plus,
  Trash2,
  X,
  CalendarDays,
  HelpCircle,
  Edit,
  Download,
  ExternalLink,
  Maximize2,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  ZoomIn,
  MoreHorizontal,
  SlidersHorizontal,
  CircleCheck,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import PlateImage from "@/components/PlateImage";
import { getSettings } from "@/app/actions";
import ImageViewer from "./ImageViewer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

const SortButton = ({ label, field, sort, onSort }) => {
  const isActive = sort.field === field;
  const Icon = isActive
    ? sort.direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 p-0 hover:bg-transparent hover:text-primary data-[active=true]:text-primary flex items-center gap-1"
      onClick={() => onSort(field)}
      data-active={isActive}
    >
      {label}
      <Icon className="h-2 w-2" />
    </Button>
  );
};

export default function PlateTable({
  data,
  loading,
  availableTags,
  pagination,
  filters,
  onUpdateFilters,
  onAddTag,
  onRemoveTag,
  onAddKnownPlate,
  onDeleteRecord,
  onValidate,
  availableCameras,
  onCorrectPlate,
  timeFormat = 12,
  sort = { field: "", direction: "" },
  onSort = () => {},
}) {
  console.log("PlateTable rendering with data:", data.length);

  // Only keep state for modals and temporary form data
  const [isAddKnownPlateOpen, setIsAddKnownPlateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activePlate, setActivePlate] = useState(null);
  const [newKnownPlate, setNewKnownPlate] = useState({ name: "", notes: "" });
  const [correction, setCorrection] = useState(null);
  const [isCorrectPlateOpen, setIsCorrectPlateOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [isLive, setIsLive] = useState(true);
  const [prefetchedImages, setPrefetchedImages] = useState(new Set());
  const [biHost, setBiHost] = useState(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  //zoom/crop stuff
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

  const router = useRouter();

  // Cycle through images without clicking out with arrow keys
  const handleKeyPress = (e) => {
    // Don't handle arrow keys if any input element is focused
    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA"
    ) {
      return;
    }

    if (selectedImage === null) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (selectedIndex + 1) % data.length;
      const nextPlate = data[nextIndex];
      handleImageClick(e, nextPlate);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex =
        selectedIndex <= 0 ? data.length - 1 : selectedIndex - 1;
      const prevPlate = data[prevIndex];
      handleImageClick(e, prevPlate);
    }
  };

  // Add keyboard listener when modal is open
  useEffect(() => {
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [selectedImage, selectedIndex, data]);

  useEffect(() => {
    async function fetchBiHost() {
      const config = await getSettings();
      console.log(config.blueiris.host);
      if (config?.blueiris?.host) {
        setBiHost(config.blueiris.host);
      }
    }
    fetchBiHost();
  }, []);

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        router.refresh();
      }, 4500);
    }
    return () => clearInterval(interval);
  }, [isLive, router]);

  // Helper functions
  const getImageUrl = (base64Data) => {
    if (!base64Data) return "/placeholder-image.jpg";
    if (base64Data.startsWith("data:image/jpeg;base64,")) return base64Data;
    return `data:image/jpeg;base64,${base64Data}`;
  };

  const handleImageClick = (e, plate) => {
    e.preventDefault();
    const plateIndex = data.findIndex((p) => p.id === plate.id);
    let imageUrl;
    let thumbnailUrl;
    let bi_url = null;
    let crop_coordinates = null;
    if (plate.image_path) {
      // imageUrl = `/images/images/${plate.image_path.replace(/^images\//, "")}`;
      imageUrl = `/images/${plate.image_path}`;
      thumbnailUrl = `/images/${plate.thumbnail_path}`;
    } else if (plate.image_data) {
      // Handle legacy base64 data
      imageUrl = plate.image_data.startsWith("data:image/jpeg;base64,")
        ? plate.image_data
        : `data:image/jpeg;base64,${plate.image_data}`;
    } else {
      return; // No image available
    }

    if (plate.bi_path) {
      bi_url = plate.bi_path;
    }

    if (plate.crop_coordinates) {
      crop_coordinates = plate.crop_coordinates;
    }

    setSelectedIndex(plateIndex);
    setSelectedImage({
      url: imageUrl,
      thumbnail: thumbnailUrl,
      plateNumber: plate.plate_number,
      id: plate.id,
      validated: plate.validated,
      bi_path: bi_url,
      crop_coordinates: plate.crop_coordinates,
    });

    // Reset zoom and position when opening new image
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (selectedImage && data && data.length > 0) {
      const currentPlate = data.find((plate) => plate.id === selectedImage.id);

      if (currentPlate && currentPlate.validated !== selectedImage.validated) {
        setSelectedImage((prev) => ({
          ...prev,
          validated: currentPlate.validated,
        }));
      }
    }
  }, [data, selectedImage]);

  const handleDownloadImage = async () => {
    if (!selectedImage) return;

    try {
      // For base64 images
      if (selectedImage.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = selectedImage.url;
        link.download = `plate-${selectedImage.plateNumber}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For file-based images, fetch from API
      const response = await fetch(selectedImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plate-${selectedImage.plateNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  useEffect(() => {
    // Only prefetch if we have data and aren't loading
    if (!loading && data?.length > 0) {
      data.forEach((plate) => {
        if (plate.image_path && !prefetchedImages.has(plate.image_path)) {
          const fullImageUrl = `/images/${plate.image_path}`;
          // Create a new Image to prefetch
          const img = new Image();
          img.src = fullImageUrl;
          setPrefetchedImages((prev) => new Set([...prev, plate.image_path]));
        }
      });
    }
  }, [data, loading]);

  const handleOpenInNewTab = () => {
    if (!selectedImage) return;

    // If it's a regular file path just open the URL directly
    if (!selectedImage.url.startsWith("data:")) {
      window.open(selectedImage.url, "_blank");
      return;
    }

    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>License Plate Image - ${selectedImage.plateNumber}</title>
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #000;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${selectedImage.url}" 
                 alt="${selectedImage.plateNumber}"
                 onerror="this.onerror=null; this.src='/placeholder.jpg';" />
          </body>
        </html>
      `);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toUpperCase();
    const cursorPosition = e.target.selectionStart;
    // Save cursor position
    setTimeout(() => {
      e.target.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
    setSearchInput(value);

    // Delay the actual filter update
    setTimeout(() => {
      onUpdateFilters({ search: value });
    }, 300);
  };

  const handleFuzzySearchToggle = (checked) => {
    onUpdateFilters({ fuzzySearch: checked });
  };

  const handleTagChange = (value) => {
    onUpdateFilters({ tag: value });
  };

  const handleCameraChange = (value) => {
    onUpdateFilters({ camera: value === "all" ? "" : value });
  };

  const handleDateRangeSelect = (range) => {
    onUpdateFilters({
      dateFrom: range.from ? range.from.toDateString() : null,
      dateTo: range.to ? range.to.toDateString() : null,
    });
  };

  const handlePageSizeChange = (value) => {
    onUpdateFilters({ pageSize: value });
  };

  const handleAddKnownPlateSubmit = async () => {
    if (!activePlate) return;
    await onAddKnownPlate(
      activePlate.plate_number,
      newKnownPlate.name,
      newKnownPlate.notes
    );
    setIsAddKnownPlateOpen(false);
    setNewKnownPlate({ name: "", notes: "" });
  };

  const handleDeleteSubmit = async () => {
    if (!activePlate) return;
    await onDeleteRecord(activePlate.id); //fix use id
    setIsDeleteConfirmOpen(false);
  };

  const handleCorrectSubmit = async () => {
    if (!correction) return;

    const formData = new FormData();
    formData.append("readId", correction.id);
    formData.append("oldPlateNumber", correction.plateNumber);
    formData.append("newPlateNumber", correction.newPlateNumber);
    formData.append("correctAll", correction.correctAll.toString());
    formData.append("removePrevious", correction.removePlate.toString());

    await onCorrectPlate(formData);
    selectedImage &&
      setSelectedImage((prev) => ({
        ...prev,
        plateNumber: correction.newPlateNumber,
      }));
    setCorrection(null);
    setIsCorrectPlateOpen(false);
  };

  const clearFilters = () => {
    setSearchInput("");
    onUpdateFilters({
      search: "",
      fuzzySearch: null,
      tag: null,
      dateFrom: null,
      dateTo: null,
      hourFrom: null,
      hourTo: null,
      camera: null,
    });
  };

  const formatConfidence = (confidence) => {
    if (
      confidence === null ||
      confidence === undefined ||
      isNaN(Number(confidence))
    ) {
      return "N/A";
    }

    const numericConfidence = Number(confidence); // Ensure it's a number

    if (numericConfidence.toFixed(0) == 100) {
      return "100%";
    }

    return `${numericConfidence * 100}%`; // Keep formatting consistent
  };

  const HourRangeFilter = ({ timeFormat, value = {}, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Local display state - what the user actually entered
    const [displayHours, setDisplayHours] = useState({
      from: null,
      to: null,
    });

    // Generate hours based on time format
    const hours = Array.from({ length: 24 }, (_, i) => {
      if (timeFormat === 12) {
        const period = i < 12 ? "AM" : "PM";
        const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
        return { value: i, label: `${hour}${period}` };
      }
      return { value: i, label: i.toString().padStart(2, "0") + ":00" };
    });

    const getTimeRangeLabel = () => {
      if (
        typeof displayHours.from === "number" &&
        typeof displayHours.to === "number" &&
        displayHours.from >= 0 &&
        displayHours.from < 24 &&
        displayHours.to >= 0 &&
        displayHours.to < 24
      ) {
        // Always show what the user entered
        return `${hours[displayHours.from].label} - ${
          hours[displayHours.to].label
        }`;
      }
      return "Hour Range";
    };

    const handleApply = () => {
      if (
        typeof displayHours.from === "number" &&
        typeof displayHours.to === "number"
      ) {
        const tzOffset = -(new Date().getTimezoneOffset() / 60);

        // Convert to UTC for the query parameters only
        let utcFrom = (displayHours.from - tzOffset + 24) % 24;
        let utcTo = (displayHours.to - tzOffset + 24) % 24;

        // Adjust if the range spans past midnight
        if (displayHours.to < displayHours.from) {
          utcTo += 24; // Move 'to' into the next day
        }

        // Pass UTC hours for the query but maintain our local display state
        onChange({
          from: Math.floor(utcFrom),
          to: Math.floor(utcTo),
        });
        setIsOpen(false);
      }
    };

    const handleClear = () => {
      setDisplayHours({ from: null, to: null });
      onChange({ from: undefined, to: undefined });
      setIsOpen(false);
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="hidden sm:flex gap-2 dark:bg-[#161618]"
          >
            <Clock className="h-4 w-4" />
            {getTimeRangeLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-4">
          <div className="space-y-4 ">
            <div className="space-y-2">
              <h4 className="font-medium">Filter by Hour</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select
                    value={
                      typeof displayHours.from === "number"
                        ? displayHours.from.toString()
                        : undefined
                    }
                    onValueChange={(val) =>
                      setDisplayHours((prev) => ({
                        ...prev,
                        from: parseInt(val),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Start hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem
                          key={hour.value}
                          value={hour.value.toString()}
                        >
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select
                    value={
                      typeof displayHours.to === "number"
                        ? displayHours.to.toString()
                        : undefined
                    }
                    onValueChange={(val) =>
                      setDisplayHours((prev) => ({
                        ...prev,
                        to: parseInt(val),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="End hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem
                          key={hour.value}
                          value={hour.value.toString()}
                        >
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                className="flex-1"
                onClick={handleApply}
                disabled={
                  typeof displayHours.from !== "number" ||
                  typeof displayHours.to !== "number"
                }
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Mobile filter sheet content
  const MobileFilters = () => (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Filter by Tag</h4>
        <Select value={filters.tag} onValueChange={handleTagChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
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
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Filter by Camera</h4>
        <Select
          value={filters.cameraName || "all"}
          onValueChange={handleCameraChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cameras</SelectItem>
            {availableCameras.map((camera) => (
              <SelectItem key={camera} value={camera}>
                {camera}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Date Range</h4>
        <Calendar
          mode="range"
          defaultMonth={filters.dateRange?.from}
          selected={{
            from: filters.dateRange?.from,
            to: filters.dateRange?.to,
          }}
          onSelect={(range) => {
            onUpdateFilters({
              dateFrom: range?.from ? range.from.toDateString() : null,
              dateTo: range?.to ? range.to.toDateString() : null,
            });
          }}
          className="rounded-md border"
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Hour Range</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Select
              value={filters.hourRange?.from?.toString()}
              onValueChange={(val) =>
                onUpdateFilters({
                  hourFrom: val,
                  hourTo: filters.hourRange?.to?.toString(),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Start hour" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const period = i < 12 ? "AM" : "PM";
                  const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
                  return (
                    <SelectItem key={i} value={i.toString()}>
                      {timeFormat === 12
                        ? `${hour}${period}`
                        : `${i.toString().padStart(2, "0")}:00`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Select
              value={filters.hourRange?.to?.toString()}
              onValueChange={(val) =>
                onUpdateFilters({
                  hourFrom: filters.hourRange?.from?.toString(),
                  hourTo: val,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="End hour" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const period = i < 12 ? "AM" : "PM";
                  const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
                  return (
                    <SelectItem key={i} value={i.toString()}>
                      {timeFormat === 12
                        ? `${hour}${period}`
                        : `${i.toString().padStart(2, "0")}:00`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Other Options</h4>
        <div className="flex items-center space-x-2 border rounded-md p-3">
          <Switch
            checked={filters.fuzzySearch}
            onCheckedChange={handleFuzzySearchToggle}
            id="mobile-fuzzy-search"
          />
          <label htmlFor="mobile-fuzzy-search" className="text-sm">
            Fuzzy Search
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Fuzzy search helps find plates with potential OCR misreads.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-2 border rounded-md p-3">
          <Switch
            checked={isLive}
            onCheckedChange={setIsLive}
            id="mobile-live-updates"
          />
          <label htmlFor="mobile-live-updates" className="text-sm">
            Live Updates
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Results Per Page</h4>
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger>
            <SelectValue>{pagination.pageSize}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} results per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 flex space-x-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            clearFilters();
            setIsFilterSheetOpen(false);
          }}
        >
          Clear Filters
        </Button>
        <Button className="flex-1" onClick={() => setIsFilterSheetOpen(false)}>
          Apply Filters
        </Button>
      </div>
    </div>
  );

  return (
    <div className="">
      <div className="py-4">
        {/* Search and Filters section - Desktop and Mobile */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div className="flex w-full flex-wrap items-start sm:items-center gap-2">
            {/* Search bar - Full Width on Mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center w-full sm:w-auto">
                <Input
                  placeholder="Search plates..."
                  icon={
                    <Search className="text-gray-400 dark:text-gray-500 absolute left-1.5 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                  }
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="w-full sm:w-64 h-9 dark:bg-[#161618]"
                />

                {/* Mobile Filter Button */}
                <Sheet
                  open={isFilterSheetOpen}
                  onOpenChange={setIsFilterSheetOpen}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="ml-2 sm:hidden h-9 w-9 dark:bg-[#161618]"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="h-[80vh] px-4 pt-0 pb-8 overflow-y-auto"
                  >
                    <SheetHeader className="sticky top-0 bg-background pt-4 pb-2 z-10">
                      <SheetTitle>Filter Results</SheetTitle>
                    </SheetHeader>
                    <MobileFilters />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Fuzzy Search - Desktop only */}
              <div className="hidden sm:flex items-center border rounded-md px-3 h-9 dark:bg-[#161618]">
                <div className="flex items-center space-x-2 ">
                  <Switch
                    checked={filters.fuzzySearch}
                    onCheckedChange={handleFuzzySearchToggle}
                    id="fuzzy-search"
                  />
                  <label
                    htmlFor="fuzzy-search"
                    className="text-sm cursor-pointer text-nowrap"
                  >
                    Fuzzy Search
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Fuzzy search helps find plates with potential OCR
                          misreads. For example, searching for
                          &ldquo;7MLG803&rdquo; will also find similar plates
                          like &ldquo;7NLG803&rdquo; or &ldquo;7ML6803&rdquo;.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden sm:flex flex-wrap gap-2">
              <Select value={filters.tag} onValueChange={handleTagChange}>
                <SelectTrigger className="w-[180px] h-9 dark:bg-[#161618]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
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
                </SelectContent>
              </Select>
              <Select
                value={filters.cameraName || "all"}
                onValueChange={handleCameraChange}
              >
                <SelectTrigger className="w-[180px] dark:bg-[#161618]">
                  <SelectValue placeholder="Filter by camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cameras</SelectItem>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera} value={camera}>
                      {camera}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden sm:flex gap-2 dark:bg-[#161618]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd")} -{" "}
                          {format(filters.dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange?.from}
                    selected={{
                      from: filters.dateRange?.from,
                      to: filters.dateRange?.to,
                    }}
                    onSelect={(range) => {
                      onUpdateFilters({
                        dateFrom: range.from ? range.from.toDateString() : null,
                        dateTo: range.to ? range.to.toDateString() : null,
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <HourRangeFilter
                timeFormat={timeFormat}
                value={filters.hourRange || {}}
                onChange={(hourRange) =>
                  onUpdateFilters({
                    hourFrom:
                      typeof hourRange.from === "number"
                        ? hourRange.from.toString()
                        : undefined,
                    hourTo:
                      typeof hourRange.to === "number"
                        ? hourRange.to.toString()
                        : undefined,
                  })
                }
              />
              <div className="flex items-center border rounded-md px-3 h-9 dark:bg-[#161618]">
                <div className="flex items-center space-x-2 ">
                  <Switch
                    checked={isLive}
                    onCheckedChange={setIsLive}
                    id="live-updates"
                  />
                  <label
                    htmlFor="live-updates"
                    className="text-sm cursor-pointer"
                  >
                    Live Updates
                  </label>
                </div>
              </div>

              {(filters.search ||
                filters.tag !== "all" ||
                filters.dateRange.from ||
                (filters.hourRange?.from !== undefined &&
                  filters.hourRange?.to !== undefined)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Results per page - Desktop only */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[6rem] dark:bg-[#161618]">
                <SelectValue>{pagination.pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground text-nowrap">
              per page
            </span>
          </div>
        </div>

        {/* Active filters display on mobile */}
        {(filters.search ||
          filters.tag !== "all" ||
          filters.dateRange.from ||
          filters.cameraName ||
          (filters.hourRange?.from !== undefined &&
            filters.hourRange?.to !== undefined)) && (
          <div className="flex sm:hidden items-center gap-2 mb-4 overflow-x-auto pb-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Active filters:
            </span>

            {filters.search && (
              <Badge
                variant="outline"
                className="text-xs h-6 whitespace-nowrap"
              >
                Search: {filters.search}
              </Badge>
            )}

            {filters.tag !== "all" && (
              <Badge
                variant="outline"
                className="text-xs h-6 whitespace-nowrap"
              >
                Tag: {filters.tag}
              </Badge>
            )}

            {filters.cameraName && (
              <Badge
                variant="outline"
                className="text-xs h-6 whitespace-nowrap"
              >
                Camera: {filters.cameraName}
              </Badge>
            )}

            {filters.dateRange.from && (
              <Badge
                variant="outline"
                className="text-xs h-6 whitespace-nowrap"
              >
                Date: {format(filters.dateRange.from, "MMM d")}
                {filters.dateRange.to &&
                  ` - ${format(filters.dateRange.to, "MMM d")}`}
              </Badge>
            )}

            {filters.hourRange?.from !== undefined &&
              filters.hourRange?.to !== undefined && (
                <Badge
                  variant="outline"
                  className="text-xs h-6 whitespace-nowrap"
                >
                  Hours: {filters.hourRange.from} - {filters.hourRange.to}
                </Badge>
              )}
          </div>
        )}

        {/* Table - Desktop view and Mobile cards */}
        <div className="rounded-md border dark:bg-[#0e0e10]">
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="dark:bg-[#161618]">
                <TableRow>
                  <TableHead className="w-24">Image</TableHead>
                  <TableHead className="w-28 sm:w-16">Plate Number</TableHead>
                  <TableHead className="w-28 hidden sm:table-cell">%</TableHead>
                  <TableHead className="w-24 hidden sm:table-cell">
                    <SortButton
                      label="Occurrences"
                      field="occurrence_count"
                      sort={sort}
                      onSort={onSort}
                    />
                  </TableHead>
                  <TableHead className="w-18 sm:w-40">Tags</TableHead>
                  <TableHead className="w-32 hidden sm:table-cell">
                    Camera
                  </TableHead>
                  <TableHead className="w-24 sm:w-40">
                    <SortButton
                      label="Timestamp"
                      field="timestamp"
                      sort={sort}
                      onSort={onSort}
                    />
                  </TableHead>
                  <TableHead className="w-32 text-right hidden sm:table-cell">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((plate) => (
                    <TableRow key={plate.id}>
                      <TableCell>
                        <PlateImage
                          plate={plate}
                          onClick={(e) => handleImageClick(e, plate)}
                          className=""
                        />
                      </TableCell>
                      <TableCell
                        className={`font-medium font-mono ${
                          plate.flagged && "text-[#F31260]"
                        }`}
                      >
                        {plate.plate_number}
                        {plate.known_name && (
                          <div className="text-gray-500 dark:text-gray-400 font-sans">
                            {plate.known_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatConfidence(plate.confidence)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {plate.occurrence_count}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {plate.tags?.length > 0 ? (
                            plate.tags.map((tag) => (
                              <Badge
                                key={tag.name}
                                variant="secondary"
                                className="text-xs py-0.5 pl-2 pr-1 flex items-center space-x-1"
                                style={{
                                  backgroundColor: tag.color,
                                  color: "#fff",
                                }}
                              >
                                <span>{tag.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white rounded-full"
                                  onClick={() =>
                                    onRemoveTag(plate.plate_number, tag.name)
                                  }
                                >
                                  <X className="h-3 w-3" />
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
                      <TableCell className="hidden sm:table-cell">
                        {plate.camera_name || (
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Unknown
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(plate.timestamp).toLocaleString("en-US", {
                          hour12: timeFormat === 12,
                        })}
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <div className="flex space-x-2 justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Tag className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {availableTags.map((tag) => (
                                <DropdownMenuItem
                                  key={tag.name}
                                  onClick={() =>
                                    onAddTag(plate.plate_number, tag.name)
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
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className=""
                            onClick={() => {
                              setCorrection({
                                id: plate.id,
                                plateNumber: plate.plate_number,
                                newPlateNumber: plate.plate_number,
                                correctAll: false,
                                removePlate: false,
                              });
                              setIsCorrectPlateOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {biHost && plate.bi_path ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                window.open(
                                  `http://${biHost}/${plate.bi_path}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" disabled>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={
                              plate?.validated
                                ? "text-green-500 hover:text-green-700"
                                : ""
                            }
                            onClick={() => {
                              onValidate(plate.id, !plate.validated);
                            }}
                          >
                            {plate?.validated ? (
                              <CircleCheck className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
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
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : data.length === 0 ? (
              <div className="p-4 text-center">No results found</div>
            ) : (
              <div className="divide-y">
                {data.map((plate) => (
                  <div key={plate.id} className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Image and basic info */}
                      <div className="flex-shrink-0" style={{ width: "80px" }}>
                        <PlateImage
                          plate={plate}
                          onClick={(e) => handleImageClick(e, plate)}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row - Plate number and actions */}
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <div
                              className={`font-medium font-mono text-sm ${
                                plate.flagged && "text-[#F31260]"
                              }`}
                            >
                              {plate.plate_number}
                            </div>
                            {plate.known_name && (
                              <div className="text-xs text-muted-foreground">
                                {plate.known_name}
                              </div>
                            )}
                          </div>

                          {/* Mobile actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setActivePlate(plate);
                                  setIsAddKnownPlateOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Known Plates
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setCorrection({
                                    id: plate.id,
                                    plateNumber: plate.plate_number,
                                    newPlateNumber: plate.plate_number,
                                    correctAll: false,
                                    removePlate: false,
                                  });
                                  setIsCorrectPlateOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Correct Plate
                              </DropdownMenuItem>
                              {biHost && plate.bi_path ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `http://${biHost}/${plate.bi_path}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open in Blue Iris
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                className="text-red-500"
                                onClick={() => {
                                  setActivePlate(plate);
                                  setIsDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Middle row - Tags */}
                        <div className="mb-2">
                          {plate.tags?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {plate.tags.map((tag) => (
                                <Badge
                                  key={tag.name}
                                  variant="secondary"
                                  className="text-[10px] py-0.5 pl-1.5 pr-1 flex items-center gap-1"
                                  style={{
                                    backgroundColor: tag.color,
                                    color: "#fff",
                                  }}
                                >
                                  <span>{tag.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white rounded-full"
                                    onClick={() =>
                                      onRemoveTag(plate.plate_number, tag.name)
                                    }
                                  >
                                    <X className="h-2 w-2" />
                                  </Button>
                                </Badge>
                              ))}

                              {/* Add tag button */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 text-[10px] px-1.5"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Tag
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {availableTags.map((tag) => (
                                    <DropdownMenuItem
                                      key={tag.name}
                                      onClick={() =>
                                        onAddTag(plate.plate_number, tag.name)
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
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                No tags
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 text-[10px] px-1.5"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Tag
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {availableTags.map((tag) => (
                                    <DropdownMenuItem
                                      key={tag.name}
                                      onClick={() =>
                                        onAddTag(plate.plate_number, tag.name)
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
                            </div>
                          )}
                        </div>

                        {/* Bottom row - Camera, confidence, time */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Camera: </span>
                            {plate.camera_name || "Unknown"}
                          </div>
                          <div>
                            <span className="font-medium">Confidence: </span>
                            {formatConfidence(plate.confidence)}
                          </div>
                          <div>
                            <span className="font-medium">Occurrences: </span>
                            {plate.occurrence_count}
                          </div>
                          <div>
                            <span className="font-medium">Time: </span>
                            {new Date(plate.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour12: timeFormat === 12,
                                hour: "numeric",
                                minute: "numeric",
                              }
                            )}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Date: </span>
                            {new Date(plate.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Mobile & Desktop */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {pagination.total > 0 ? (
              <>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )}{" "}
                of {pagination.total} results
              </>
            ) : (
              "No results"
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPreviousPage}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="dark:bg-[#161618]"
              onClick={pagination.onNextPage}
              disabled={
                pagination.page * pagination.pageSize >= pagination.total
              }
            >
              Next
            </Button>
          </div>
        </div>

        {/* Modals - These work on both mobile and desktop */}
        <Dialog
          open={selectedImage !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedImage(null);
              setSelectedIndex(-1);
            }
          }}
        >
          <DialogContent className="max-w-7xl sm:max-w-7xl w-[calc(100vw-32px)] sm:w-2/3">
            <DialogHeader>
              <DialogTitle>
                License Plate Image - {selectedImage?.plateNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[40vh] sm:h-[60vh]">
              {selectedImage && (
                <ImageViewer
                  image={selectedImage}
                  onClose={() => setSelectedImage(null)}
                />
              )}
            </div>
            <DialogFooter>
              <div className="flex flex-col sm:flex-row justify-between w-full gap-4 sm:gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      setCorrection({
                        id: selectedImage.id,
                        plateNumber: selectedImage.plateNumber,
                        newPlateNumber: selectedImage.plateNumber,
                        correctAll: false,
                        removePlate: false,
                      });
                      setIsCorrectPlateOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Correct Plate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      setActivePlate({
                        ...selectedImage,
                        plate_number: selectedImage.plateNumber,
                      });
                      setIsAddKnownPlateOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Add to Known</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                      >
                        <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Add Tag
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {availableTags.map((tag) => (
                        <DropdownMenuItem
                          key={tag.name}
                          onClick={() =>
                            onAddTag(selectedImage.plateNumber, tag.name)
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
                    variant="outline"
                    size="sm"
                    className={
                      selectedImage?.validated
                        ? "text-xs sm:text-sm text-green-500"
                        : "text-xs sm:text-sm"
                    }
                    onClick={() => {
                      onValidate(selectedImage.id, !selectedImage.validated);
                    }}
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Confirm AI Label</span>
                  </Button>
                </div>
                <div className="flex justify-end space-x-2">
                  {biHost && selectedImage?.bi_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() =>
                        window.open(
                          `http://${biHost}/${selectedImage.bi_path}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="whitespace-nowrap">Blue Iris</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={handleDownloadImage}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Download</span>
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAddKnownPlateOpen}
          onOpenChange={setIsAddKnownPlateOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add to Known Plates</DialogTitle>
              <DialogDescription>
                Add details for the plate {activePlate?.plate_number}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newKnownPlate.name}
                  onChange={(e) =>
                    setNewKnownPlate({ ...newKnownPlate, name: e.target.value })
                  }
                  placeholder="Enter name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newKnownPlate.notes}
                  onChange={(e) =>
                    setNewKnownPlate({
                      ...newKnownPlate,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Additional notes or details"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleAddKnownPlateSubmit}
                className="w-full sm:w-auto"
              >
                Add to Known Plates
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this record? This will not
                delete the plate from the known plates table.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSubmit}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={correction !== null}
          onOpenChange={(open) => !open && setCorrection(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Correct Plate Number</DialogTitle>
              <DialogDescription>
                Update the incorrect plate number recognition.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Current Plate Input */}
              <div className="grid w-full items-center gap-2">
                {" "}
                {/* Added w-full and changed gap-4 to gap-2 for tighter label/input spacing */}
                <Label htmlFor="current-plate">Current</Label>
                <Input
                  id="current-plate"
                  value={correction?.plateNumber || ""}
                  disabled
                  className="font-mono text-base p-2 h-10 w-full" // Increased text size, padding, height, and added w-full
                />
              </div>
              {/* New Plate Input */}
              <div className="grid w-full items-center gap-2 mb-4">
                {" "}
                {/* Added w-full and changed gap-4 to gap-2 */}
                <Label htmlFor="new-plate">New</Label>
                <Input
                  id="new-plate"
                  value={correction?.newPlateNumber || ""}
                  onChange={(e) => {
                    setCorrection((curr) => ({
                      ...curr,
                      newPlateNumber: e.target.value,
                    }));
                  }}
                  onBlur={(e) => {
                    setCorrection((curr) => ({
                      ...curr,
                      newPlateNumber: e.target.value.toUpperCase(),
                    }));
                  }}
                  className="font-mono text-base p-2 h-10 w-full uppercase" // Increased text size, padding, height, and added w-full
                  placeholder="ENTER NEW PLATE NUMBER"
                />
              </div>
              {/* Switches */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="correct-all"
                  checked={correction?.correctAll || false}
                  onCheckedChange={(checked) =>
                    setCorrection((curr) => ({
                      ...curr,
                      correctAll: checked,
                    }))
                  }
                />
                <Label htmlFor="correct-all">
                  Correct all occurrences of this plate number
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="remove-plate"
                  checked={correction?.removePlate || false}
                  onCheckedChange={(checked) =>
                    setCorrection((curr) => ({
                      ...curr,
                      removePlate: checked,
                    }))
                  }
                />
                <Label htmlFor="remove-plate">
                  Remove previous plate number from database
                </Label>
              </div>
              {correction?.removePlate && (
                <div className="text-sm text-amber-500 dark:text-amber-400">
                  Warning: This is a destructive action. Ensure the previous
                  plate number does not belong to any real vehicles to avoid
                  loss of data.
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCorrection(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCorrectSubmit}
                disabled={
                  !correction?.newPlateNumber ||
                  correction.newPlateNumber === correction.plateNumber
                }
                className="w-full sm:w-auto"
              >
                Update Plate Number
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
