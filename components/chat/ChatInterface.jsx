"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getAvailableAgents, sendChatMessage } from "@/lib/agentchat";
import {
  createUserMessage,
  createAIMessage,
  formatTimestamp,
} from "@/lib/agentchat-utils";
import {
  Send,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Bot,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "./ChatContext";
import { MessageRenderer } from "./MessageRenderer";

export function ChatInterface({ className }) {
  const { isChatOpen, closeChat, openChat } = useChatContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentsLoaded, setAgentsLoaded] = useState(false);

  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load agents when component mounts
  const loadAgents = useCallback(async () => {
    try {
      const result = await getAvailableAgents();
      if (result.success && result.data) {
        setAgents(result.data);
        if (result.data.length > 0 && !selectedAgent) {
          setSelectedAgent(result.data[0].id);
        }
      }
      setAgentsLoaded(true);
    } catch (error) {
      console.error("Failed to load agents:", error);
      setAgentsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isChatOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  // Keyboard shortcut to open chat (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openChat();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openChat]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedAgent) return;

    const userMessage = createUserMessage(input);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    try {
      const result = await sendChatMessage(
        userMessage.text,
        selectedAgent,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );

      if (result.success) {
        const assistantMessage = createAIMessage(
          result.response || "No response received",
          selectedAgent,
          result.agentTitle,
          result.structured
        );
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage = createAIMessage(
          result.error || "An unknown error occurred",
          selectedAgent,
          undefined,
          undefined,
          true
        );
        setMessages((prev) => [...prev, errorMessage]);
        setError(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = createAIMessage(
        "I'm sorry, I encountered an error processing your request. Please try again.",
        selectedAgent,
        undefined,
        undefined,
        true
      );
      setMessages((prev) => [...prev, errorMessage]);
      setError(
        `Failed to send message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Just clear local chat state - agent handles its own memory
  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  const retryLastMessage = () => {
    if (messages.length >= 2) {
      const lastUserMessage = messages[messages.length - 2];
      if (lastUserMessage.sender === "user") {
        setInput(lastUserMessage.text);
        setMessages((prev) => prev.slice(0, -2));
      }
    }
  };

  const getSelectedAgentTitle = () => {
    const agent = agents.find((a) => a.id === selectedAgent);
    return agent ? agent.title : "AI Assistant";
  };

  const renderMessage = (message) => {
    const isUser = message.sender === "user";
    const isError = message.isError;

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-4 p-4 rounded-lg transition-colors",
          isUser ? "bg-blue-50 dark:bg-blue-950/20" : "",
          isError ? "bg-red-50 dark:bg-red-950/20" : ""
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
            isUser
              ? "bg-blue-600 dark:bg-blue-500"
              : isError
              ? "bg-red-500"
              : "bg-muted"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : isError ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {isUser
                  ? "You"
                  : isError
                  ? "Error"
                  : message.agentTitle || "AI Assistant"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(message.timestamp)}
              </span>
              {message.structured && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Rich
                </Badge>
              )}
            </div>
            {isError && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryLastMessage}
                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>

          <div className="text-sm">
            {isUser ? (
              <div
                className={cn(
                  "text-foreground whitespace-pre-wrap",
                  isError && "text-red-700 dark:text-red-300"
                )}
              >
                {message.text}
              </div>
            ) : (
              <MessageRenderer
                message={message}
                className={isError ? "text-red-700 dark:text-red-300" : ""}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet
      open={isChatOpen}
      onOpenChange={(open) => (open ? openChat() : closeChat())}
      modal={false}
    >
      <SheetContent
        side="right"
        className="p-0 flex flex-col shadow-2xl border-l transition-all duration-300 ease-in-out"
        style={{
          width: "min(35vw)",
          maxWidth: "85vw",
          minWidth: "20vw",
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left font-semibold text-lg">
                {getSelectedAgentTitle()}
              </SheetTitle>
              <p className="text-sm text-muted-foreground text-left">
                Ask questions about your license plate database
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Agent:</span>
            <Select
              value={selectedAgent || ""}
              onValueChange={setSelectedAgent}
            >
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!agentsLoaded && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea ref={scrollAreaRef} className="h-full px-6">
            <div className="space-y-4 py-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground space-y-6 mt-8">
                  <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">
                      Welcome to your AI Assistant!
                    </p>
                    <p className="text-sm mt-2">
                      Ask me anything about your license plate data, statistics,
                      or run custom queries.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Pro tip: Press ⌘K or Ctrl+K to quickly open this assistant
                      from anywhere
                    </p>
                  </div>
                  <div className="text-sm space-y-2 p-6 bg-muted/50 rounded-lg max-w-md mx-auto border">
                    <p className="font-medium text-foreground">Try asking:</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        • &ldquo;Show me recent activity trends with
                        charts&rdquo;
                      </p>
                      <p>
                        • &ldquo;Display known plates with their details&rdquo;
                      </p>
                      <p>• &ldquo;Generate a metrics dashboard&rdquo;</p>
                      <p>• &ldquo;Find activity during the 3am hour&rdquo;</p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedAgent && agentsLoaded && (
                <div className="text-center text-muted-foreground space-y-6 mt-8">
                  <div className="mx-auto w-16 h-16 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <Bot className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">
                      Please select an agent above
                    </p>
                    <p className="text-sm mt-2">
                      Choose an AI agent to start chatting with your database.
                    </p>
                  </div>
                </div>
              )}

              {messages.map(renderMessage)}

              {isLoading && (
                <div className="flex gap-4 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {getSelectedAgentTitle()}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Thinking...
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">
                        Complex queries may take a couple minutes...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="border-t p-6 bg-background">
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedAgent
                    ? "Ask about your ALPR database..."
                    : "Select an agent first..."
                }
                className="resize-none min-h-[60px] max-h-32 text-sm pr-12 border-border"
                disabled={isLoading || !selectedAgent}
                rows={2}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || !selectedAgent}
                size="sm"
                className="absolute bottom-2 right-2 h-8 w-8 p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Press Enter to send, Shift+Enter for new line • ⌘K to reopen
                </span>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Chat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
