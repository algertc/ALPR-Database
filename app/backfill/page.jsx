import { dbBackfill } from "@/actions";
import { BackfillButton } from "./BackfillButton";

export const dynamic = "force-dynamic";

export default async function BackfillPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">
        Backfill Occurrence Counts to New Column in Plates Table
      </h1>
      <BackfillButton dbBackfill={dbBackfill} />
    </div>
  );
}
