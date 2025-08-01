import DashboardLayout from "@/components/layout/MainLayout";
import TitleNavbar from "@/components/layout/TitleNav";

export default function DownloadPage() {
  return (
    <DashboardLayout>
      <TitleNavbar title="Plate Database">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-3xl font-bold mb-4">Download</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </TitleNavbar>
    </DashboardLayout>
  );
}
