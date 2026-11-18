import { describe, expect, it } from "vitest";
import { formatWib } from "./date";

describe("formatWib", () => {
  it("formats in Asia/Jakarta as dd MMM yyyy HH:mm WIB", () => {
    // 2026-03-05T17:30Z is 2026-03-06 00:30 in WIB (UTC+7).
    expect(formatWib(new Date("2026-03-05T17:30:00Z"))).toBe(
      "06 Mar 2026 00:30 WIB",
    );
  });

  it("accepts ISO strings", () => {
    expect(formatWib("2026-08-17T03:05:00Z")).toBe("17 Agt 2026 10:05 WIB");
  });
});
