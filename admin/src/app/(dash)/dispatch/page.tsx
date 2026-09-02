"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  Field,
  Select,
  Textarea,
  Button,
  Alert,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import { errorMessage } from "@/lib/error/apiError";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";

interface DispatchMessage {
  _id: string;
  message: string;
  priority: "NORMAL" | "URGENT";
  targetVehicleId?: string | null;
  createdAt: string;
}

export default function DispatchPage() {
  const qc = useQueryClient();
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });

  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [target, setTarget] = useState("");

  const listQ = useQuery({
    queryKey: ["dispatch", "messages"],
    queryFn: async () => {
      const res = await api.get<{ messages: DispatchMessage[] }>(
        "/admin/dispatch/messages?limit=50"
      );
      return res.data?.messages ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      await api.post("/admin/dispatch/messages", {
        message: message.trim(),
        priority,
        ...(target ? { targetVehicleId: target } : {}),
      });
    },
    onSuccess: () => {
      setMessage("");
      setTarget("");
      setPriority("NORMAL");
      qc.invalidateQueries({ queryKey: ["dispatch", "messages"] });
    },
  });

  const vehReg = (id?: string | null) =>
    (vehiclesQ.data?.vehicles ?? []).find((v) => v._id === id)
      ?.registrationNumber ?? id;

  return (
    <>
      <PageHeader
        title="Dispatch"
        description="Broadcast operational messages to drivers and conductors in the field."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader title="Send a message" />
          <CardBody className="flex flex-col gap-4">
            {send.isError && (
              <Alert tone="error">{errorMessage(send.error)}</Alert>
            )}
            <Field label="Message" required>
              {(p) => (
                <Textarea
                  {...p}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                {(p) => (
                  <Select
                    {...p}
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "NORMAL" | "URGENT")
                    }
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                )}
              </Field>
              <Field label="Target vehicle" hint="Blank = all vehicles">
                {(p) => (
                  <Select
                    {...p}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">All vehicles</option>
                    {(vehiclesQ.data?.vehicles ?? []).map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.registrationNumber}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Button
              loading={send.isPending}
              disabled={message.trim().length === 0}
              onClick={() => send.mutate()}
            >
              Broadcast
            </Button>
            <p className="text-xs text-muted-foreground">
              Delivery is over the realtime socket. If the socket CORS origin
              isn&apos;t configured for :3001, the message is still recorded but
              not pushed live.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent messages" />
          <CardBody className="p-0">
            {listQ.error ? (
              <div className="p-4">
                <Alert tone="error">{errorMessage(listQ.error)}</Alert>
              </div>
            ) : listQ.isLoading ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : (listQ.data ?? []).length === 0 ? (
              <EmptyState title="No messages" />
            ) : (
              <ul className="divide-y">
                {(listQ.data ?? []).map((m) => (
                  <li key={m._id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {m.priority === "URGENT" && (
                          <Badge tone="danger">Urgent</Badge>
                        )}
                        <span>{m.message}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.targetVehicleId
                        ? `→ ${vehReg(m.targetVehicleId)}`
                        : "→ all vehicles"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
