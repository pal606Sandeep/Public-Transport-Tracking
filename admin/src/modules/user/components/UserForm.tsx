"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { ROLES, ROLE_LABEL } from "@/constants/roles";
import type { AdminUser, UserInput } from "../services/user.service";

const ALL_ROLES = Object.values(ROLES);

export function UserForm({
  user,
  submitting,
  error,
  onSubmit,
}: {
  user?: AdminUser;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: UserInput) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<string>(user?.role ?? "PASSENGER");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    setLocalError(null);
    if (name.trim().length === 0 || email.trim().length === 0) {
      setLocalError("Name and email are required.");
      return;
    }
    if (!user && password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    const input: UserInput = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      role,
    };
    if (password) input.password = password;
    onSubmit(input);
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}
      {localError && <Alert tone="error">{localError}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Phone">
          {(p) => (
            <Input
              {...p}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Email" required>
        {(p) => (
          <Input
            {...p}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role" required>
          {(p) => (
            <Select
              {...p}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={user ? "New password" : "Password"}
          hint={user ? "Leave blank to keep current" : "At least 8 characters"}
          required={!user}
        >
          {(p) => (
            <Input
              {...p}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
      </div>

      <div className="pt-2">
        <Button loading={submitting} onClick={submit}>
          {user ? "Save changes" : "Create user"}
        </Button>
      </div>
    </div>
  );
}
