import { FlaggedPlatesTable } from "@/components/FlaggedPlatesTable";
import DashboardLayout from "@/components/layout/MainLayout";
import BasicTitle from "@/components/layout/BasicTitle";
import { getFlagged } from "@/actions";
export const dynamic = "force-dynamic";

export default async function FlaggedPlatesPage() {
  const flaggedPlates = await getFlagged();

  return (
    <DashboardLayout>
      <BasicTitle title="Flagged Plates">
        <FlaggedPlatesTable initialData={flaggedPlates} />
      </BasicTitle>
    </DashboardLayout>
  );
}
