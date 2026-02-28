import { describe, expect, it } from "vitest";
import { createResultIdentityKey, normalizePlayerIdentity } from "@/lib/results-identity";

describe("results identity helpers", () => {
  it("normalizes player names for dedupe", () => {
    expect(normalizePlayerIdentity("  John   Doe ")).toBe("john doe");
    expect(normalizePlayerIdentity("JULIAO")).toBe("juliao");
  });

  it("prefers normalized player identity over user id", () => {
    expect(
      createResultIdentityKey({
        player: " John Doe ",
        userId: "local-user-1",
        id: "row-1"
      })
    ).toBe("player:john doe");
  });

  it("falls back to user id when player name is missing", () => {
    expect(
      createResultIdentityKey({
        player: "   ",
        userId: "Local-User-1",
        id: "row-1"
      })
    ).toBe("user:local-user-1");
  });

  it("falls back to row id when player name and user id are missing", () => {
    expect(
      createResultIdentityKey({
        player: "",
        userId: "",
        id: "ROW-1"
      })
    ).toBe("row:row-1");
  });
});
