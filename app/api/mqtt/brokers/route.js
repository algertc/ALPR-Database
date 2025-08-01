import { getMqttBrokers, addMqttBroker } from "@/lib/db";
import { getAuthConfig } from "@/lib/auth";

export async function GET(req) {
  try {
    const brokers = await getMqttBrokers();
    return Response.json({ success: true, data: brokers });
  } catch (error) {
    console.error("Error fetching MQTT brokers:", error);
    return Response.json(
      { success: false, error: "Failed to fetch MQTT brokers" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, broker, port, topic, username, password, useTls } = data;

    if (!name || !broker || !topic) {
      return Response.json(
        { success: false, error: "Name, broker, and topic are required" },
        { status: 400 }
      );
    }

    const result = await addMqttBroker(
      name,
      broker,
      port || 1883,
      topic,
      username || null,
      password || null,
      useTls || false
    );

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("Error adding MQTT broker:", error);
    return Response.json(
      { success: false, error: "Failed to add MQTT broker" },
      { status: 500 }
    );
  }
}
