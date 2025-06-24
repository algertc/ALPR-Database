// lib/sse.js
// Global in-memory store for SSE clients. This persists across requests
// in a single Node.js process (your Docker container).
let sseClients = [];
let nextClientId = 0; // Simple unique ID for clients

export function removeSseClient(clientId) {
  sseClients = sseClients.filter((client) => client.id !== clientId);
  console.log(
    `[SSE] Client ${clientId} disconnected. Total clients: ${sseClients.length}`
  );
}

export function addSseClient(res) {
  const clientId = nextClientId++;
  sseClients.push({ id: clientId, res });
  console.log(
    `[SSE] Client ${clientId} connected. Total clients: ${sseClients.length}`
  );
  return clientId;
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
