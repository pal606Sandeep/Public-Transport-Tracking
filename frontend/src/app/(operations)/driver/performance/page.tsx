import { PageHeader } from "@/components/ui";
import { PerformanceCard } from "@/modules/driver/components/PerformanceCard";

export default function DriverPerformancePage() {
  return (
    <>
      <PageHeader title="My performance" back />
      <div className="p-4">
        <PerformanceCard />
      </div>
    </>
  );
}
