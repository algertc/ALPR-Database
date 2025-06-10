import { KnownPlatesTable } from "@/components/KnownPlatesTable";
import DashboardLayout from "@/components/layout/MainLayout";
import BasicTitle from "@/components/layout/BasicTitle";
import { getKnownPlatesList } from "@/actions";

export const dynamic = "force-dynamic";

export default async function KnownPlatesPage() {
  const response = await getKnownPlatesList();
  const knownPlates = response.success ? response.data : [];

  return (
    <DashboardLayout>
      <BasicTitle
        title="Known Plates"
        subtitle={
          "Store information and keep track of vehicles you're familiar with"
        }
      >
        {knownPlates.length > 0 ? (
          <KnownPlatesTable initialData={knownPlates} />
        ) : (
          <p>No known plates found in the database.</p>
        )}
      </BasicTitle>
    </DashboardLayout>
  );
}
