import { PageHeader } from "@/components/ui";
import { ScanTicket } from "@/modules/conductor/components/ScanTicket";

export default function ConductorScanPage() {
  return (
    <>
      <PageHeader title="Scan / validate" back />
      <ScanTicket />
    </>
  );
}
