"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
  Input,
  Select,
  Alert,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
  Table,
  THead,
  TR,
  TH,
  TD,
  Modal,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useUsers,
  useSetUserActive,
  useDeleteUser,
} from "@/modules/user/hooks/useUsers";
import { ROLES, ROLE_LABEL } from "@/constants/roles";
import type { AdminUser } from "@/modules/user/services/user.service";

const ALL_ROLES = Object.values(ROLES);

export default function UsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);

  const { data, isLoading, error, isFetching } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: role || undefined,
  });
  const setActive = useSetUserActive();
  const del = useDeleteUser();

  const users = data?.users ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Users"
        description="All accounts — passengers, staff and admins."
        action={
          <Link href="/users/new">
            <Button>Add user</Button>
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name / email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="max-w-[12rem]"
        >
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r] ?? r}
            </option>
          ))}
        </Select>
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users" hint="No accounts match your filters." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {users.map((u) => (
                <TR key={u._id}>
                  <TD className="font-medium">
                    <Link href={`/users/${u._id}`} className="hover:underline">
                      {u.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{u.email}</TD>
                  <TD className="text-muted-foreground">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </TD>
                  <TD>
                    {u.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/users/${u._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={
                          setActive.isPending &&
                          setActive.variables?.id === u._id
                        }
                        onClick={() =>
                          setActive.mutate({
                            id: u._id,
                            active: !u.isActive,
                          })
                        }
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          {pg && (
            <Pagination
              page={pg.page}
              totalPages={pg.totalPages ?? 1}
              onPage={setPage}
            />
          )}
        </>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete user"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={del.isPending}
              onClick={async () => {
                if (toDelete) await del.mutateAsync(toDelete._id);
                setToDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        Account &quot;{toDelete?.email}&quot; will be removed.
      </Modal>
    </>
  );
}
