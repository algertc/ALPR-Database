"use server";

import path from "path";
import fs from "fs/promises";

export async function getSystemLogs() {
  try {
    const logFile = path.join(process.cwd(), "logs", "app.log");
    const content = await fs.readFile(logFile, "utf8");

    return {
      success: true,
      data: content
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            // Try parsing as Winston JSON format
            const parsed = JSON.parse(line);
            return {
              timestamp: new Date(parsed.timestamp).toLocaleString(),
              level: parsed.level.toUpperCase(),
              // Strip ANSI color codes
              message: parsed.message.replace(/\u001b\[\d+m/g, ""),
            };
          } catch (e) {
            // Fall back to old format if it's not JSON
            const [timestamp, rest] = line.split(" [");
            const [level, ...messageParts] = rest.split("] ");
            return {
              timestamp,
              level,
              message: messageParts.join("] "),
            };
          }
        }),
    };
  } catch (error) {
    console.error("Error reading logs:", error);
    return { success: false, error: "Failed to read system logs" };
  }
}