"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { TripCreateForm } from "@/modules/trip/components/TripCreateForm";
import { useCreateTrip } from "@/modules/trip/hooks/useTrips";

export default function NewTripPage() {
  const router = useRouter();
  const create = useCreateTrip();

  return (
    <>
      <PageHeader
        title="Add trip"
        description="Ad-hoc trip. To create many at once, generate them from a schedule."
        backHref="/trips"
      />
      <TripCreateForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (trip) => router.replace(`/trips/${trip._id}`),
          })
        }
      />
    </>
  );
}
