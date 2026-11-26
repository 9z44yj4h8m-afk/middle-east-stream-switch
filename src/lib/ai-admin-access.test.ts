import { describe, it, expect } from "vitest";
import { validAiAdminUsername, mayDisableAiAccount } from "./ai-admin-access";
describe("AI administration access", () => {
  it("accepts ahmed as the administration username and rejects a different username", () => {
    expect(validAiAdminUsername("ahmed")).toBe(true);
    expect(validAiAdminUsername(" Ahmed ")).toBe(true);
    expect(validAiAdminUsername("other")).toBe(false);
  });
  it("preserves existing password-only owner entry points", () => { expect(validAiAdminUsername(undefined)).toBe(true); });
  it("prevents an administrator from disabling their own account", () => {
    expect(mayDisableAiAccount("actor", "actor", "other@example.com")).toBe(false);
    expect(mayDisableAiAccount("actor", "member", "other@example.com")).toBe(true);
  });
  it("prevents disabling the fixed owner account", () => {
    expect(mayDisableAiAccount("actor", "owner", "a0552525337@gmail.com")).toBe(false);
    expect(mayDisableAiAccount("actor", "member", "member@example.com")).toBe(true);
  });
});