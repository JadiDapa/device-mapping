import { describe, expect, it } from "vitest";
import { passwordResetSchema, userCreateSchema, userRoleSchema } from "./user";

const valid = {
  name: " Budi ",
  email: " Budi@Example.COM ",
  password: "rahasia123",
  role: "guest",
};

describe("user validators", () => {
  it("trims the name and lowercases the email", () => {
    expect(userCreateSchema.parse(valid)).toMatchObject({
      name: "Budi",
      email: "budi@example.com",
    });
  });

  it("rejects short passwords, bad emails and unknown roles", () => {
    expect(
      userCreateSchema.safeParse({ ...valid, password: "x" }).success,
    ).toBe(false);
    expect(
      userCreateSchema.safeParse({ ...valid, email: "nope" }).success,
    ).toBe(false);
    expect(userRoleSchema.safeParse("root").success).toBe(false);
    expect(passwordResetSchema.safeParse({ password: "short" }).success).toBe(
      false,
    );
  });
});
