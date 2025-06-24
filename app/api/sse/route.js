// app/api/sse/plate-reads/route.js
// This file specifically handles the Server-Sent Events (SSE) endpoint.
// It needs to be a Node.js runtime environment to manage persistent connections.
// For self-hosted Docker, Next.js typically runs as a long-lived Node.js process,
// allowing this in-memory `sseClients` array to persist.

// IMPORTANT: For production deployments on Vercel or other serverless
// platforms, this in-memory solution will NOT work across instances.
// You would need a distributed pub/sub system (Redis, Pusher, etc.) instead.

import { addSseClient, removeSseClient } from "@/lib/sse";

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

  const clientId = addSseClient(res);

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
