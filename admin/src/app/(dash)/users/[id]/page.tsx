"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FullScreenLoader, Alert, Badge } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { UserForm } from "@/modules/user/components/UserForm";
import { useUser, useUpdateUser } from "@/modules/user/hooks/useUsers";

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading, error } = useUser(id);
  const update = useUpdateUser(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !user)
    return (
      <>
        <PageHeader title="User" backHref="/users" />
        <Alert tone="error">{errorMessage(error) || "User not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        backHref="/users"
        action={
          <Badge tone={user.isActive ? "success" : "neutral"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        }
      />
      <UserForm
        user={user}
        submitting={update.isPending}
        error={update.error}
        onSubmit={(input) =>
          update.mutate(input, { onSuccess: () => router.push("/users") })
        }
      />
    </>
  );
}
