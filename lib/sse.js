// lib/sse.js
// This is a simplified in-memory store for SSE connections.
// NOT SUITABLE FOR PRODUCTION DEPLOYMENTS THAT SCALE (e.g., Vercel, serverless functions).
// For production, consider a distributed pub/sub system like Redis, Pusher, Ably, etc.

let clients = []; // Stores objects like { res: HttpResponse, heartbeat: IntervalID }

export function addClient(req, res) {
  // Pass req to manage its 'close' event
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering if applicable

  const heartbeat = setInterval(() => {
    try {
      res.write(
        `event: heartbeat\ndata: ${JSON.stringify({
          message: "keep-alive",
        })}\n\n`
      );
    } catch (e) {
      console.error(
        "SSE: Error sending heartbeat, client likely disconnected:",
        e.message
      );
      removeClient(res); // Clean up if heartbeat fails
    }
  }, 30000); // Send heartbeat every 30 seconds

  clients.push({ res, heartbeat });
  console.log(`SSE: Client connected. Total clients: ${clients.length}`);

  // Handle client disconnect directly here
  req.on("close", () => {
    console.log(
      `SSE: Client connection closed for ${
        req.socket?.remoteAddress || "unknown"
      }`
    );
    removeClient(res);
  });
}

export function removeClient(resToRemove) {
  clients = clients.filter((client) => {
    if (client.res === resToRemove) {
      clearInterval(client.heartbeat); // Clear the specific heartbeat interval
      return false; // Remove this client
    }
    return true; // Keep other clients
  });
  console.log(`SSE: Client disconnected. Total clients: ${clients.length}`);
}

export function sendEventToClients(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (error) {
      console.error(
        "SSE: Error sending event to client, removing:",
        error.message
      );
      // If there's an error writing, assume client disconnected
      removeClient(client.res);
    }
  });
}
