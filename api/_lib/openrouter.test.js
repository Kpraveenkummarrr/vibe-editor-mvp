import { describe, it, expect } from "vitest";
import { sanitizeAction, getAiStatus } from "./openrouter.js";

describe("sanitizeAction", () => {
  it("passes through a well-formed action", () => {
    const action = sanitizeAction({
      reply: "Made the button bolder.",
      scope: "element",
      textReplacement: null,
      brandColorHex: null,
      styleChanges: { fontWeight: "800", borderRadius: "12px" },
    });
    expect(action).toEqual({
      reply: "Made the button bolder.",
      scope: "element",
      targetHint: null,
      remove: false,
      textReplacement: null,
      brandColorHex: null,
      styleChanges: { fontWeight: "800", borderRadius: "12px" },
    });
  });

  it("drops style properties not on the allow-list", () => {
    const action = sanitizeAction({
      reply: "ok",
      styleChanges: { position: "fixed", top: "0", fontWeight: "700" },
    });
    expect(action.styleChanges).toEqual({ fontWeight: "700" });
  });

  it("rejects javascript: and expression() values even on allowed properties", () => {
    const action = sanitizeAction({
      reply: "ok",
      styleChanges: {
        color: "javascript:alert(1)",
        backgroundColor: "expression(alert(1))",
        fontWeight: "700",
      },
    });
    expect(action.styleChanges).toEqual({ fontWeight: "700" });
  });

  it("rejects an invalid brandColorHex", () => {
    const action = sanitizeAction({ reply: "ok", brandColorHex: "not-a-color", styleChanges: { fontWeight: "700" } });
    expect(action.brandColorHex).toBeNull();
  });

  it("accepts a valid brandColorHex", () => {
    const action = sanitizeAction({ reply: "ok", brandColorHex: "#123abc" });
    expect(action.brandColorHex).toBe("#123abc");
  });

  it("returns null when the action has no usable effect", () => {
    expect(sanitizeAction({ reply: "ok", styleChanges: { position: "fixed" } })).toBeNull();
    expect(sanitizeAction({})).toBeNull();
    expect(sanitizeAction(null)).toBeNull();
    expect(sanitizeAction("not an object")).toBeNull();
  });

  it("caps overly long strings", () => {
    const action = sanitizeAction({ reply: "x".repeat(1000), textReplacement: "y".repeat(1000) });
    expect(action.reply.length).toBeLessThanOrEqual(300);
    expect(action.textReplacement.length).toBeLessThanOrEqual(300);
  });
});

describe("getAiStatus", () => {
  it("reports not configured when no key is present", () => {
    expect(getAiStatus({})).toEqual({ configured: false, model: "meta-llama/llama-3.1-8b-instruct:free" });
  });

  it("reports configured when a key is present, with model override", () => {
    expect(getAiStatus({ OPENROUTER_API_KEY: "abc", OPENROUTER_MODEL: "some/model:free" })).toEqual({
      configured: true,
      model: "some/model:free",
    });
  });
});
