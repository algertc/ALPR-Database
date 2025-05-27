// app/api/sse/plate-reads/route.js
// This file specifically handles the Server-Sent Events (SSE) endpoint.
// It needs to be a Node.js runtime environment to manage persistent connections.
// For self-hosted Docker, Next.js typically runs as a long-lived Node.js process,
// allowing this in-memory `sseClients` array to persist.

// IMPORTANT: For production deployments on Vercel or other serverless
// platforms, this in-memory solution will NOT work across instances.
// You would need a distributed pub/sub system (Redis, Pusher, etc.) instead.

// Global in-memory store for SSE clients. This persists across requests
// in a single Node.js process (your Docker container).
let sseClients = [];
let nextClientId = 0; // Simple unique ID for clients

function removeSseClient(clientId) {
  sseClients = sseClients.filter((client) => client.id !== clientId);
  console.log(
    `[SSE] Client ${clientId} disconnected. Total clients: ${sseClients.length}`
  );
}

// Exported function for other parts of the server (like the POST handler)
// to send events to all connected SSE clients.
export function sendSseEventToAll(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (e) {
      console.error(
        `[SSE] Error writing to client ${client.id}, removing:`,
        e.message
      );
      // Clean up client if writing fails (indicates disconnection)
      removeSseClient(client.id);
      try {
        client.res.end(); // Attempt to gracefully end the broken connection
      } catch (endErr) {
        /* ignore */
      }
    }
  });
}

// GET handler for Server-Sent Events
export async function GET(req) {
  // Directly access the native Node.js `res` object
  // This is typically available when Next.js is run with `next start`
  // or a custom server in a Node.js environment.
  const res = req.res;

  if (!res) {
    console.error(
      "Native response object (res) not available for SSE. Ensure Node.js runtime."
    );
    return new Response(
      JSON.stringify({
        error: "SSE requires Node.js runtime & direct res access",
      }),
      { status: 500 }
    );
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for proxies like Nginx

  // Send HTTP 200 OK headers
  res.writeHead(200);

  const clientId = nextClientId++;
  sseClients.push({ id: clientId, res });
  console.log(
    `[SSE] Client ${clientId} connected. Total clients: ${sseClients.length}`
  );

  // Send an initial heartbeat to confirm connection and prevent immediate timeouts
  res.write(
    `event: heartbeat\ndata: ${JSON.stringify({
      message: "initial-heartbeat",
    })}\n\n`
  );

  // Set up a periodic heartbeat to keep the connection alive (prevents proxy/browser timeouts)
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(
        `event: heartbeat\ndata: ${JSON.stringify({
          message: "keep-alive",
        })}\n\n`
      );
    } catch (e) {
      console.error(
        `[SSE] Heartbeat failed for client ${clientId}, assuming disconnected.`
      );
      clearInterval(heartbeatInterval);
      removeSseClient(clientId);
      try {
        res.end();
      } catch (endErr) {
        /* ignore */
      }
    }
  }, 25000); // Send every 25 seconds

  // Clean up on client disconnection (browser tab closed, refresh, etc.)
  req.on("close", () => {
    console.log(`[SSE] Client ${clientId} connection closed.`);
    clearInterval(heartbeatInterval); // Clear the specific heartbeat for this client
    removeSseClient(clientId);
    try {
      res.end(); // Ensure the response is truly ended
    } catch (endErr) {
      /* ignore */
    }
  });

  // Return a promise that never resolves, so the connection stays open indefinitely
  return new Promise(() => {});
}
