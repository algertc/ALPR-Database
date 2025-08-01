"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "./ChatContext";

export function ChatButton() {
  const { isChatOpen, toggleChat } = useChatContext();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            // onClick={toggleChat}
            className={cn(
              "w-10 h-10 p-0 hover:bg-transparent [&:not(:disabled)]:hover:bg-transparent",
              isChatOpen ? "text-blue-500" : "hover:text-blue-500"
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="border-0 bg-muted">
          <div className="text-center">
            <p>AI Assistant (Coming Soon!)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Press ⌘K or Ctrl+K
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
