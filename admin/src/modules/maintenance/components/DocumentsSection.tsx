"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Select,
  Alert,
  Badge,
  Spinner,
  Modal,
  Table,
  THead,
  TR,
  TH,
  TD,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { DOCUMENT_TYPES, type DocumentStatus, type DocumentType } from "../maintenance.types";
import { useVehicleDocuments, useDocumentMutations } from "../useMaintenance";

const tone: Record<DocumentStatus, "success" | "warning" | "danger"> = {
  VALID: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
};

export function DocumentsSection({ vehicleId }: { vehicleId: string }) {
  const { data: documents, isLoading, error } = useVehicleDocuments(vehicleId);
  const d = useDocumentMutations(vehicleId);
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<DocumentType>("REGISTRATION");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const submit = () => {
    d.create.mutate(
      {
        type,
        documentNumber: documentNumber.trim(),
        issuedAt: issuedAt ? new Date(issuedAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setDocumentNumber("");
          setIssuedAt("");
          setExpiresAt("");
        },
      }
    );
  };

  const docs = documents ?? [];

  return (
    <Card>
      <CardHeader
        title="Documents"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />
      <CardBody>
        {error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : isLoading ? (
          <Spinner />
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents on file. Add registration, insurance, fitness, PUC.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>Number</TH>
                <TH>Expires</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {docs.map((doc) => (
                <TR key={doc._id}>
                  <TD className="font-medium">{doc.type}</TD>
                  <TD className="text-muted-foreground">
                    {doc.documentNumber}
                  </TD>
                  <TD className="text-muted-foreground">
                    {doc.expiresAt
                      ? new Date(doc.expiresAt).toLocaleDateString()
                      : "—"}
                    {doc.status !== "EXPIRED" && doc.daysLeft > 0 && (
                      <span className="ml-1 text-xs">
                        ({doc.daysLeft}d)
                      </span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={tone[doc.status]}>{doc.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      loading={
                        d.remove.isPending && d.remove.variables === doc._id
                      }
                      onClick={() => d.remove.mutate(doc._id)}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add vehicle document"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={d.create.isPending}
              disabled={documentNumber.trim().length === 0}
              onClick={submit}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {d.create.isError && (
            <Alert tone="error">{errorMessage(d.create.error)}</Alert>
          )}
          <Field label="Type">
            {(p) => (
              <Select
                {...p}
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Document number">
            {(p) => (
              <Input
                {...p}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issued at">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
              )}
            </Field>
            <Field label="Expires at">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
