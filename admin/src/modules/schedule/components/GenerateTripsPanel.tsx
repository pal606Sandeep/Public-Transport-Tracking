"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useGenerateTrips } from "../hooks/useSchedules";

export function GenerateTripsPanel({ scheduleId }: { scheduleId: string }) {
  const gen = useGenerateTrips(scheduleId);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  return (
    <Card>
      <CardHeader title="Generate trips" />
      <CardBody className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Creates trip instances from this schedule for the chosen date range.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {(p) => (
              <Input
                {...p}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            )}
          </Field>
          <Field label="To">
            {(p) => (
              <Input
                {...p}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            )}
          </Field>
        </div>

        {gen.isError && <Alert tone="error">{errorMessage(gen.error)}</Alert>}
        {gen.isSuccess && (
          <Alert tone="success">
            {gen.data.count} trip{gen.data.count === 1 ? "" : "s"} generated.
          </Alert>
        )}

        <Button
          size="sm"
          loading={gen.isPending}
          onClick={() =>
            gen.mutate({
              from: new Date(from).toISOString(),
              to: new Date(to).toISOString(),
            })
          }
        >
          Generate
        </Button>
      </CardBody>
    </Card>
  );
}
