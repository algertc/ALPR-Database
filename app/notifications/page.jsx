import {
  getNotificationPlates,
  getMqttNotificationsAction,
} from "@/app/actions";
import { NotificationsTable } from "@/components/NotificationsTable";
import { MqttNotificationsTable } from "@/components/MqttNotificationsTable";
import DashboardLayout from "@/components/layout/MainLayout";
import BasicTitle from "@/components/layout/BasicTitle";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const response = await getNotificationPlates();
  const notificationPlates = response.success ? response.data : [];

  const mqttResponse = await getMqttNotificationsAction();
  const mqttNotifications = mqttResponse.success ? mqttResponse.data : [];

  return (
    <DashboardLayout>
      <BasicTitle
        title="Plate Recognition Notifications"
        subtitle={
          "Configure push & MQTT notifications to receive alerts on recognition of specific plates"
        }
      >
        <h2 className="text-2xl my-4 ml-1 font-medium text-zinc">
          Push Notifications
        </h2>
        <NotificationsTable initialData={notificationPlates} />
        <h2 className="text-2xl mb-4 ml-1 font-medium text-zinc">MQTT</h2>
        <MqttNotificationsTable initialData={mqttNotifications} />
      </BasicTitle>
    </DashboardLayout>
  );
}
