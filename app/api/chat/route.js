import { NextResponse } from "next/server";
import { verifySession, updateAuthConfig, getAuthConfig } from "@/lib/auth";
import { getAgents } from "@/lib/settings";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { message, timezone, agentId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Get session from cookies and verify it
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    const sessionId = sessionCookie?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const isValidSession = await verifySession(sessionId);
    if (!isValidSession) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get the selected agent from settings
    const agents = await getAgents();
    const selectedAgent = agents.find(
      (agent) => agent.id === agentId && agent.enabled
    );

    if (!selectedAgent) {
      return NextResponse.json(
        { error: `Agent not found or disabled: ${agentId}` },
        { status: 404 }
      );
    }

    // Get existing sessionId for this specific agent
    const config = await getAuthConfig();
    const userSession = config.sessions[sessionId] || {};
    const agentSessionKey = `${agentId}_sessionId`;
    let agentSessionId = userSession[agentSessionKey] || null;

    // Only include timezone info if the message seems time-related
    const isTimeRelated =
      /\b(time|hour|am|pm|morning|afternoon|evening|night|today|yesterday|when|schedule|late|early)\b/i.test(
        message
      );

    // Prepare request payload - this is the same for ALL agents
    const requestPayload = {
      chatInput: message,
    };

    // Add timezone context for time-related queries
    if (isTimeRelated && timezone) {
      const currentTime = new Date().toISOString();
      const userLocalTime = new Date().toLocaleString("en-US", {
        timeZone: timezone,
      });

      requestPayload.timezone = timezone;
      requestPayload.currentTime = currentTime;
      requestPayload.userLocalTime = userLocalTime;
      requestPayload.timeInstructions = `IMPORTANT: Query the database timezone first using 'SELECT current_setting('timezone')' or 'SELECT now()'. Then calculate time offsets. For example, if user mentions '3am' and they're in ${timezone}, convert that to the database timezone for your queries. This avoids expensive SQL timezone conversions on large datasets.`;
    }

    // Include agent-specific sessionId if we have one
    if (agentSessionId) {
      requestPayload.sessionId = agentSessionId;
    }

    // Make the request to the agent's webhook URL
    const response = await fetch(selectedAgent.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Agent ${selectedAgent.title} error ${response.status}:`,
        errorText
      );
      return NextResponse.json(
        {
          error: `Agent ${selectedAgent.title} responded with status: ${response.status}`,
        },
        { status: 500 }
      );
    }

    // Get new sessionId from response header (if provided)
    const newAgentSessionId = response.headers.get("x-session-id");
    const responseBody = await response.text();

    // Parse response - same logic for ALL agents
    let agentMessage;
    let structuredData = null;

    try {
      const parsedResponse = JSON.parse(responseBody);

      if (parsedResponse.agentMessage) {
        agentMessage = parsedResponse.agentMessage;
        structuredData = parsedResponse.structuredData || null;
      } else if (parsedResponse.response && parsedResponse.structured) {
        agentMessage = parsedResponse.response;
        structuredData = parsedResponse.structured;
      } else if (parsedResponse.output) {
        agentMessage = parsedResponse.output;
        structuredData = null;
      } else if (typeof parsedResponse === "string") {
        agentMessage = parsedResponse;
      } else {
        agentMessage =
          parsedResponse.message ||
          parsedResponse.text ||
          parsedResponse.content ||
          JSON.stringify(parsedResponse);
      }
    } catch (parseError) {
      agentMessage = responseBody;
    }

    // Validate structured data format if present
    if (structuredData && typeof structuredData === "object") {
      const validTypes = [
        "chart",
        "known_plates",
        "table",
        "metrics",
        "timeline",
        "tags",
        "code",
        "image",
        "images",
      ];
      if (!structuredData.type || !validTypes.includes(structuredData.type)) {
        console.warn("Invalid structured data type:", structuredData.type);
        structuredData = null;
      }
    }

    // Store the new agent sessionId if we got one
    if (newAgentSessionId && newAgentSessionId !== agentSessionId) {
      if (!config.sessions[sessionId]) {
        config.sessions[sessionId] = {};
      }
      config.sessions[sessionId][agentSessionKey] = newAgentSessionId;
      await updateAuthConfig(config);
    }

    return NextResponse.json({
      response: agentMessage || "No response received",
      timestamp: new Date().toISOString(),
      structured: structuredData,
      agentId: agentId,
      agentTitle: selectedAgent.title,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: `Failed to communicate with AI agent: ${error.message}` },
      { status: 500 }
    );
  }
}
