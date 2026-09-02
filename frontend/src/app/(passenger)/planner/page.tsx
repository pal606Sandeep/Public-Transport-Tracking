import { PageHeader } from "@/components/ui";
import { JourneyPlanner } from "@/modules/journey/components/JourneyPlanner";

export default function PlannerPage() {
  return (
    <>
      <PageHeader title="Plan a journey" />
      <JourneyPlanner />
    </>
  );
}
