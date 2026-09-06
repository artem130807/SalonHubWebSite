import { describe, expect, it } from "vitest";
import { removeById, upsertById } from "@/lib/chat-messages";

describe("chat message list helpers", () => {
  it("inserts a new message and replaces an edited one", () => {
    const first = { id: "1", body: "hi" };
    const inserted = upsertById([], first);
    expect(inserted).toEqual([first]);
    const edited = upsertById(inserted, { id: "1", body: "hello" });
    expect(edited).toEqual([{ id: "1", body: "hello" }]);
  });

  it("removes a deleted message", () => {
    expect(removeById([{ id: "1" }, { id: "2" }], "1")).toEqual([{ id: "2" }]);
  });
});
