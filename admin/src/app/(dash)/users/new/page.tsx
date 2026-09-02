"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { UserForm } from "@/modules/user/components/UserForm";
import { useCreateUser } from "@/modules/user/hooks/useUsers";

export default function NewUserPage() {
  const router = useRouter();
  const create = useCreateUser();

  return (
    <>
      <PageHeader title="Add user" backHref="/users" />
      <UserForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (u) => router.replace(`/users/${u._id}`),
          })
        }
      />
    </>
  );
}
