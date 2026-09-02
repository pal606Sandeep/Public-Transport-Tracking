"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { uploadMany } from "@/lib/uploads";
import {
  COMPLAINT_CATEGORIES,
  CATEGORY_LABEL,
  type ComplaintCategory,
} from "../constant/complaint.types";
import { useCreateComplaint } from "../hooks/useComplaints";

export function ComplaintForm() {
  const router = useRouter();
  const create = useCreateComplaint();

  const [category, setCategory] = useState<ComplaintCategory>("bus_delay");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = create.isPending || uploading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (subject.trim().length < 4) {
      setLocalError("Please add a short subject (at least 4 characters).");
      return;
    }
    if (description.trim().length < 10) {
      setLocalError("Please describe what happened (at least 10 characters).");
      return;
    }
    try {
      let attachmentKeys: string[] | undefined;
      if (files.length) {
        setUploading(true);
        attachmentKeys = await uploadMany(files, "complaint");
        setUploading(false);
      }
      const complaint = await create.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        attachmentKeys,
      });
      router.replace(`/complaints/${complaint._id}`);
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

      <Field label="Category" required>
        {({ id }) => (
          <select
            id={id}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ComplaintCategory)
            }
            className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Subject" required>
        {(p) => (
          <Input
            {...p}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Bus never arrived at 8:15"
            maxLength={120}
          />
        )}
      </Field>

      <Field label="What happened?" required>
        {({ id }) => (
          <textarea
            id={id}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Give as much detail as you can — route number, stop, time, vehicle number."
            className="rounded-[var(--radius-app)] border bg-card p-3 text-sm"
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
        {uploading ? "Uploading photos…" : "Submit complaint"}
      </Button>
    </form>
  );
}
