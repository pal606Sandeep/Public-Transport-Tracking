import { PageHeader } from "@/components/ui";
import { RequestAssignmentForm } from "@/modules/driver/components/RequestAssignmentForm";

export default function DriverRequestPage() {
  return (
    <>
      <PageHeader title="Request assignment" back />
      <RequestAssignmentForm />
    </>
  );
}
