"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatButton } from "@/components/chat/ChatButton";
import {
  LayoutDashboard,
  Database,
  Settings,
  TerminalSquare,
  MessageCircleQuestion,
  Menu,
  X,
} from "lucide-react";
import { BookMarked } from "lucide-react";
import { Cctv } from "lucide-react";
import { Flag } from "lucide-react";
import { BellPlus } from "lucide-react";
import { SquareTerminal } from "lucide-react";
import { GiCartwheel } from "react-icons/gi";
import { Antenna } from "lucide-react";
import TPMS from "@/components/icons/tpms";
import { useState, useEffect } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Cctv, label: "Live Feed", href: "/live_feed" },
  { icon: Database, label: "Database", href: "/database" },
  { icon: BookMarked, label: "Known Plates", href: "/known_plates" },
  { icon: Flag, label: "Watchlist", href: "/flagged" },
  { icon: BellPlus, label: "Notifications", href: "/notifications" },
  // { icon: TPMS, label: "TPMS", href: "/tpms" },
];

// Items to show in the mobile bottom navigation
const mobileNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Cctv, label: "Live Feed", href: "/live_feed" },
  { icon: Database, label: "Database", href: "/database" },
  { icon: BookMarked, label: "Plates", href: "/known_plates" },
  { icon: Menu, label: "More", href: "#more" }, // This will open the menu
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Function to navigate and close the sheet if open
  const navigateTo = (href) => {
    if (href === "#more") {
      setIsSheetOpen(true);
      return;
    }
    router.push(href);
    setIsSheetOpen(false);
  };

  const isPathActive = (path) => {
    // Special case for root dashboard to avoid matching everything
    if (path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    // For other paths, check if the current path starts with this path
    // but make sure it's a complete path segment match ("/live_feed" should match "/live_feed/something" but not "/live_feed_something")
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <TooltipProvider>
        <aside className="hidden sm:flex flex-col justify-between h-screen bg-background border-r w-14">
          <nav className="flex flex-col items-center pt-4 space-y-2">
            {navItems.map((item) => (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-10 h-10 p-0 hover:bg-transparent [&:not(:disabled)]:hover:bg-transparent",
                      isPathActive(item.href)
                        ? "text-blue-500"
                        : "hover:text-blue-500"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-0 bg-muted">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>
          <div className="flex flex-col items-center pb-4 space-y-2">
            <ThemeToggle />
            <ChatButton />
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/logs")}
                  className={cn(
                    "w-10 h-10 p-0 hover:bg-transparent [&:not(:disabled)]:hover:bg-transparent",
                    isPathActive("/logs")
                      ? "text-blue-500"
                      : "hover:text-blue-500"
                  )}
                >
                  <TerminalSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-0 bg-muted">
                System Logs
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/settings")}
                  className={cn(
                    "w-10 h-10 p-0 hover:bg-transparent [&:not(:disabled)]:hover:bg-transparent",
                    isPathActive("/settings")
                      ? "text-blue-500"
                      : "hover:text-blue-500"
                  )}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-0 bg-muted">
                Settings
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around items-center h-24 z-50 pb-4">
        {mobileNavItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            onClick={() => navigateTo(item.href)}
            className={cn(
              "flex flex-col items-center justify-center h-full w-full rounded-none py-1 px-0",
              pathname === item.href ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-[10px]">{item.label}</span>
          </Button>
        ))}
      </nav>

      {/* Mobile Menu Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] px-0 pt-0">
          <div className="sticky top-0 bg-background z-10 flex justify-between items-center px-4 py-3 border-b">
            <h2 className="font-semibold text-lg">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSheetOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="px-2 py-4 space-y-1 overflow-y-auto max-h-[calc(80vh-60px)]">
            {/* Main navigation items */}
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left h-12 px-4",
                  pathname === item.href
                    ? "bg-muted text-blue-500"
                    : "text-foreground"
                )}
                onClick={() => {
                  router.push(item.href);
                  setIsSheetOpen(false);
                }}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            ))}

            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Additional items */}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-left h-12 px-4",
                pathname === "/logs"
                  ? "bg-muted text-blue-500"
                  : "text-foreground"
              )}
              onClick={() => {
                router.push("/logs");
                setIsSheetOpen(false);
              }}
            >
              <TerminalSquare className="h-5 w-5 mr-3" />
              System Logs
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-left h-12 px-4",
                pathname === "/settings"
                  ? "bg-muted text-blue-500"
                  : "text-foreground"
              )}
              onClick={() => {
                router.push("/settings");
                setIsSheetOpen(false);
              }}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>

            {/* Theme toggle */}
            <div className="px-4 py-2 mt-4">
              <div className="flex items-center">
                <span className="mr-auto">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add padding to the bottom of the page on mobile to account for the navigation bar */}
      <div className="sm:hidden h-16"></div>
    </>
  );
}
