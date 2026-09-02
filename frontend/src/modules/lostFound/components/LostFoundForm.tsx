"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { uploadMany } from "@/lib/uploads";
import {
  KIND_LABEL,
  type LostFoundKind,
} from "../constant/lostFound.types";
import { useCreateLostFound } from "../hooks/useLostFound";

const todayLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

export function LostFoundForm() {
  const router = useRouter();
  const create = useCreateLostFound();

  const [kind, setKind] = useState<LostFoundKind>("LOST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = create.isPending || uploading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (title.trim().length < 2) {
      setLocalError("Please add a short title.");
      return;
    }
    if (description.trim().length < 3) {
      setLocalError("Please describe the item.");
      return;
    }
    try {
      let attachmentKeys: string[] | undefined;
      if (files.length) {
        setUploading(true);
        attachmentKeys = await uploadMany(files, "lost_found");
        setUploading(false);
      }
      const item = await create.mutateAsync({
        kind,
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        color: color.trim() || null,
        occurredAt: new Date(occurredAt).toISOString(),
        reporterContact: contact.trim() || null,
        attachmentKeys,
      });
      router.replace(`/lost-found/${item._id}`);
    } catch (err) {
      setUploading(false);
      setLocalError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-4">
      {(localError || create.isError) && (
        <Alert tone="error">{localError ?? errorMessage(create.error)}</Alert>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["LOST", "FOUND"] as LostFoundKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              "rounded-[var(--radius-app)] border px-3 py-3 text-sm font-medium " +
              (kind === k
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground")
            }
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <Field label="What is it?" required>
        {(p) => (
          <Input
            {...p}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Black backpack"
            maxLength={200}
          />
        )}
      </Field>

      <Field label="Description" required>
        {({ id }) => (
          <textarea
            id={id}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Distinguishing marks, contents, where on the bus, etc."
            className="rounded-[var(--radius-app)] border bg-card p-3 text-sm"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          {(p) => (
            <Input
              {...p}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Bag, phone, wallet…"
              maxLength={80}
            />
          )}
        </Field>
        <Field label="Colour">
          {(p) => (
            <Input
              {...p}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Black"
              maxLength={60}
            />
          )}
        </Field>
      </div>

      <Field label="When did it happen?" required>
        {({ id }) => (
          <input
            id={id}
            type="datetime-local"
            value={occurredAt}
            max={todayLocal()}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          />
        )}
      </Field>

      <Field
        label="Contact"
        hint="How staff can reach you if there's a match."
      >
        {(p) => (
          <Input
            {...p}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email"
            maxLength={160}
          />
        )}
      </Field>

      <Field label="Photos (optional)" hint="Up to 4 images.">
        {({ id }) => (
          <input
            id={id}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 4))
            }
            className="text-sm"
          />
        )}
      </Field>

      <Button type="submit" fullWidth loading={busy}>
        {uploading ? "Uploading photos…" : "Submit report"}
      </Button>
    </form>
  );
}
