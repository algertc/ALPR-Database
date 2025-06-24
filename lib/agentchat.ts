"use server";

import { cookies } from "next/headers";
import type { StructuredData, Agent } from "@/lib/agentchat-utils";
import { getAuthConfig } from "@/lib/auth";

// Agent Management
export async function getAvailableAgents(): Promise<{
  success: boolean;
  data?: Agent[];
  error?: string;
}> {
  try {
    const config = await getAuthConfig();
    const agents = config.agents || [];

    // Add default test agent if no agents are configured
    const availableAgents = agents.filter((agent: Agent) => agent.enabled);

    if (availableAgents.length === 0) {
      // Return default test agent
      const testAgent: Agent = {
        id: "test-agent",
        title: "Test Agent",
        description: "Default test agent for ALPR database queries",
        // url: "http://localhost:5678/webhook/alt-alpr",
        url: "http://localhost:8000/alt-alpr",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      availableAgents.push(testAgent);
    }

    return {
      success: true,
      data: availableAgents,
    };
  } catch (error) {
    console.error("Error getting agents:", error);
    return { success: false, error: "Failed to get agents" };
  }
}

// Cache agents to avoid repeated lookups
let agentsCache: { data: Agent[]; timestamp: number } | null = null;
const AGENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedAgents(): Promise<Agent[]> {
  const now = Date.now();

  if (agentsCache && now - agentsCache.timestamp < AGENTS_CACHE_TTL) {
    return agentsCache.data;
  }

  const result = await getAvailableAgents();
  if (result.success && result.data) {
    agentsCache = {
      data: result.data,
      timestamp: now,
    };
    return result.data;
  }

  return [];
}

// Chat API Communication
export async function sendChatMessage(
  message: string,
  agentId: string,
  timezone: string = "UTC"
): Promise<{
  success: boolean;
  response?: string;
  structured?: StructuredData;
  agentTitle?: string;
  error?: string;
}> {
  try {
    const agents = await getCachedAgents();
    if (!agents.length) {
      return { success: false, error: "No agents available" };
    }

    const selectedAgent = agents.find((agent) => agent.id === agentId);
    if (!selectedAgent) {
      return { success: false, error: "Agent not found" };
    }

    // Get session ID from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    const sessionId = sessionCookie?.value;

    const response = await fetch(selectedAgent.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatInput: message,
        timezone: timezone,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Try to parse as JSON first, fall back to plain text
    let responseData;
    let responseText;

    try {
      const text = await response.text();
      responseText = text;
      responseData = JSON.parse(text);
    } catch (jsonError) {
      // If JSON parsing fails, treat as plain text response
      responseData = { response: responseText };
    }

    return {
      success: true,
      response: responseData.response || responseData.output || responseText,
      structured: responseData.structured,
      agentTitle: selectedAgent.title,
    };
  } catch (error) {
    console.error("Chat message error:", error);
    return {
      success: false,
      error: `Failed to send message: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
