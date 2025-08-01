import { getMqttBrokerInfo, editMqttBroker, deleteMqttBroker } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const broker = await getMqttBrokerInfo(parseInt(id));

    if (!broker) {
      return Response.json(
        { success: false, error: "Broker not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: broker });
  } catch (error) {
    console.error("Error fetching MQTT broker:", error);
    return Response.json(
      { success: false, error: "Failed to fetch MQTT broker" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { name, broker, port, topic, username, password, useTls } = data;

    if (!name || !broker || !topic) {
      return Response.json(
        { success: false, error: "Name, broker, and topic are required" },
        { status: 400 }
      );
    }

    const result = await editMqttBroker(
      parseInt(id),
      name,
      broker,
      port || 1883,
      topic,
      username || null,
      password || null,
      useTls || false
    );

    if (!result) {
      return Response.json(
        { success: false, error: "Broker not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating MQTT broker:", error);
    return Response.json(
      { success: false, error: "Failed to update MQTT broker" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await deleteMqttBroker(parseInt(id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting MQTT broker:", error);
    return Response.json(
      { success: false, error: "Failed to delete MQTT broker" },
      { status: 500 }
    );
  }
}
