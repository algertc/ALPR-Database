"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import LogMessage from "./LogMessage";

const LogViewer = ({ initialLogs }) => {
  const scrollRef = useRef(null);
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Use the specific log levels provided
  const logLevels = ["All", "WARN", "ERROR"];

  // Filter logs based on selected level and search query
  const filteredLogs =
    initialLogs?.filter((log) => {
      // "All" catches everything (INFO, metrics, etc.)
      const matchesLevel =
        selectedLevel === "All" || log.level === selectedLevel;
      const matchesSearch =
        searchQuery === "" ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.level.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    }) || [];

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };

    scrollToBottom();
  }, [filteredLogs]);

  if (!initialLogs || !initialLogs.length) {
    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        No logs available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar and Tab Navigation on same line */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-5 py-6 flex items-center space-x-4">
          {/* Search on the left */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-sm w-80"
            />
          </div>

          {/* Tab selector */}
          <div className="flex h-9 rounded-md border border-border overflow-hidden">
            {logLevels.map((level, index) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-3 text-sm font-medium transition-colors ${
                  selectedLevel === level
                    ? "text-blue-500 bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                } ${index > 0 ? "border-l border-border" : ""}`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="flex-shrink-0 border-b">
        <div className="px-6 py-4">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-9">Description</div>
            <div className="col-span-3 text-right">Date / Time</div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="p-6">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <LogMessage key={index} log={log} />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No logs found matching your criteria
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LogViewer;
