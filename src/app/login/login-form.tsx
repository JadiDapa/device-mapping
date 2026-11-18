"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { id } from "@/lib/i18n/id";

const loginSchema = z.object({
  email: z.string().min(1, id.auth.emailRequired).email(id.auth.emailInvalid),
  password: z.string().min(1, id.auth.passwordRequired),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.code === "BANNED_USER"
          ? id.auth.banned
          : error.status === 401 || error.status === 400
            ? id.auth.invalidCredentials
            : id.auth.genericError,
      );
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{id.auth.email}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                autoComplete="username"
                placeholder={id.auth.emailPlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{id.auth.password}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="current-password"
                placeholder={id.auth.passwordPlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {serverError && (
          <FieldDescription className="text-destructive" role="alert">
            {serverError}
          </FieldDescription>
        )}
        <Field>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? id.auth.submitting : id.auth.submit}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
