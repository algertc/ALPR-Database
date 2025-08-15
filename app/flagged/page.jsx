import { getFlagged } from "@/app/actions";
import { FlaggedPlatesTable } from "@/components/FlaggedPlatesTable";
import DashboardLayout from "@/components/layout/MainLayout";
import BasicTitle from "@/components/layout/BasicTitle";

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
