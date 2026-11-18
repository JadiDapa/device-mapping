"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { USER_ROLES, type UserRole } from "@/db/auth-schema";
import { formatWib } from "@/lib/date";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import {
  passwordResetSchema,
  userCreateSchema,
  type UserCreateInput,
  type UserCreateValues,
} from "@/lib/validators/user";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  setUserRoleAction,
} from "@/server/actions/users";

type Row = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean;
  createdAt: string;
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<Row | null>(null);
  const [toggling, setToggling] = useState<Row | null>(null);

  async function changeRole(row: Row, role: UserRole) {
    const res = await setUserRoleAction(row.id, role);
    if (!res.ok) toast.error(res.error);
    else toast.success(id.users.roleChanged);
    router.refresh();
  }

  async function confirmToggle() {
    if (!toggling) return;
    const activate = toggling.banned;
    const res = await setUserActiveAction(toggling.id, activate);
    setToggling(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(activate ? id.users.activated : id.users.deactivated);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!creating && (
        <Button onClick={() => setCreating(true)}>
          <PlusIcon />
          {id.users.add}
        </Button>
      )}
      {creating && (
        <CreateForm
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
          onCancel={() => setCreating(false)}
        />
      )}
      {resetting && (
        <ResetForm
          key={resetting.id}
          user={resetting}
          onDone={() => setResetting(null)}
          onCancel={() => setResetting(null)}
        />
      )}

      {users.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {id.users.empty}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="user-list">
          {users.map((u) => {
            const self = u.id === currentUserId;
            return (
              <li
                key={u.id}
                data-testid="user-row"
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{u.name}</span>
                    {self && <Badge variant="secondary">{id.users.you}</Badge>}
                    <Badge variant={u.banned ? "destructive" : "outline"}>
                      {u.banned ? id.users.inactive : id.users.active}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {u.email} · {formatWib(u.createdAt)}
                  </div>
                </div>
                <div className="w-28">
                  <NativeSelect
                    aria-label={`${id.users.role} ${u.email}`}
                    value={u.role}
                    disabled={self}
                    onChange={(e) => changeRole(u, e.target.value as UserRole)}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {id.role[r]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-9"
                  onClick={() => setResetting(u)}
                >
                  {id.users.resetPassword}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-9"
                  disabled={self}
                  onClick={() => setToggling(u)}
                >
                  {u.banned ? id.users.activate : id.users.deactivate}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggling?.banned ? id.users.activate : id.users.deactivateTitle}
            </AlertDialogTitle>
            {!toggling?.banned && (
              <AlertDialogDescription>
                {fmt(id.users.deactivateDescription, {
                  email: toggling?.email ?? "",
                })}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{id.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {toggling?.banned ? id.users.activate : id.users.deactivate}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const { control, handleSubmit, setError, formState } = useForm<
    UserCreateValues,
    unknown,
    UserCreateInput
  >({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { name: "", email: "", password: "", role: "guest" },
  });

  async function onSubmit(values: UserCreateInput) {
    const res = await createUserAction(values);
    if (!res.ok) {
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof UserCreateValues, { message: messages[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(id.users.created);
    onDone();
  }

  const text = (
    name: "name" | "email" | "password",
    label: string,
    type = "text",
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`user-${name}`}>{label}</FieldLabel>
          <Input
            {...field}
            id={`user-${name}`}
            type={type}
            autoComplete={name === "password" ? "new-password" : "off"}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{id.users.newTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            {text("name", id.users.name)}
            {text("email", id.users.email, "email")}
            {text("password", id.users.password, "password")}
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="user-role">{id.users.role}</FieldLabel>
                  <NativeSelect {...field} id="user-role">
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {id.role[r]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? id.common.saving : id.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {id.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ResetForm({
  user,
  onDone,
  onCancel,
}: {
  user: Row;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { control, handleSubmit, setError, formState } = useForm<{
    password: string;
  }>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: { password: string }) {
    const res = await resetUserPasswordAction(user.id, values);
    if (!res.ok) {
      const msg = res.fieldErrors?.password?.[0];
      if (msg) setError("password", { message: msg });
      toast.error(res.error);
      return;
    }
    toast.success(id.users.passwordReset);
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {id.users.resetPassword}: {user.email}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password">
                  {id.users.newPassword}
                </FieldLabel>
                <Input
                  {...field}
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? id.common.saving : id.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {id.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
