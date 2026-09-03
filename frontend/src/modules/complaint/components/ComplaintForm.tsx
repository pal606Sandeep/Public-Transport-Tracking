"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea, Alert } from "@/components/ui";
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
      // Photo upload needs the network; skip it when offline and queue the text.
      if (files.length && navigator.onLine) {
        setUploading(true);
        attachmentKeys = await uploadMany(files, "complaint");
        setUploading(false);
      }
      const result = await create.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        attachmentKeys,
      });
      if (result.queued) {
        router.replace("/complaints?queued=1");
        return;
      }
      router.replace(`/complaints/${result.complaint._id}`);
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
          <Select
            id={id}
            value={category}
            onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
          >
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
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
          <Textarea
            id={id}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Route number, stop, time, vehicle number — as much as you can."
          />
        )}
      </Field>

      <Field label="Photos" hint="Optional · up to 4">
        {({ id }) => (
          <input
            id={id}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 4))
            }
            className="block w-full text-[13px] text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-foreground"
          />
        )}
      </Field>

      <Button type="submit" size="xl" fullWidth loading={busy}>
        {uploading ? "Uploading photos…" : "Submit complaint"}
      </Button>
    </form>
  );
}
