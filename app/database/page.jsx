import DashboardLayout from "@/components/layout/MainLayout";
import TitleNavbar from "@/components/layout/TitleNav";
import PlateDbTable from "@/components/plateDbTable";
import { getPlates } from "@/actions";

export default async function Database() {
  let plateReads = [];

  if (typeof window !== "undefined") {
    // Stop this from trying to connect during build
    plateReads = await getPlates(1, 25, {
      key: "last_seen_at",
      direction: "desc",
    });
  }

  return (
    <DashboardLayout>
      <TitleNavbar title="Plate Database">
        <PlateDbTable initialData={plateReads} />
      </TitleNavbar>
    </DashboardLayout>
  );
}
