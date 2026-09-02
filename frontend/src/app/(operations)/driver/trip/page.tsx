import { Suspense } from "react";
import { PageHeader, FullScreenLoader } from "@/components/ui";
import { ActiveTripScreen } from "@/modules/driver/components/ActiveTripScreen";

export default function DriverTripPage() {
  return (
    <>
      <PageHeader title="Trip" back />
      <Suspense fallback={<FullScreenLoader />}>
        <ActiveTripScreen />
      </Suspense>
    </>
  );
}
