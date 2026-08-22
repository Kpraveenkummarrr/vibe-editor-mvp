import { describe, it, expect } from "vitest";
import { sanitizeAction, getAiStatus } from "./openrouter.js";

describe("sanitizeAction", () => {
  it("passes through a well-formed html+css action", () => {
    const action = sanitizeAction({
      reply: "Made the button bolder.",
      html: "<button>Click me</button>",
      css: ".btn { font-weight: 800; }",
    });
    expect(action).toEqual({
      reply: "Made the button bolder.",
      html: "<button>Click me</button>",
      css: ".btn { font-weight: 800; }",
      onClickAlert: null,
    });
  });

  it("accepts html-only or css-only responses", () => {
    expect(sanitizeAction({ reply: "ok", html: "<p>hi</p>", css: null }).css).toBeNull();
    expect(sanitizeAction({ reply: "ok", html: null, css: "p { color: red; }" }).html).toBeNull();
  });

  it("rejects html containing script tags or event handlers", () => {
    expect(sanitizeAction({ reply: "ok", html: '<button onclick="alert(1)">hi</button>' })).toBeNull();
    expect(sanitizeAction({ reply: "ok", html: "<script>alert(1)</script>" })).toBeNull();
  });

  it("rejects css containing script/expression/@import injection attempts", () => {
    expect(sanitizeAction({ reply: "ok", css: "body { background: expression(alert(1)); }" })).toBeNull();
    expect(sanitizeAction({ reply: "ok", css: "@import url('https://evil.example/track.css');" })).toBeNull();
    expect(sanitizeAction({ reply: "ok", css: "</style><script>alert(1)</script>" })).toBeNull();
  });

  it("accepts a well-formed onClickAlert", () => {
    const action = sanitizeAction({ reply: "ok", onClickAlert: { targetVibeId: "v3", message: "Welcome home!" } });
    expect(action.onClickAlert).toEqual({ targetVibeId: "v3", message: "Welcome home!" });
  });

  it("drops a malformed onClickAlert (missing message or targetVibeId), leaving no usable effect", () => {
    expect(sanitizeAction({ reply: "ok", onClickAlert: { targetVibeId: "v3" } })).toBeNull();
    expect(sanitizeAction({ reply: "ok", onClickAlert: { message: "hi" } })).toBeNull();
    // Paired with an otherwise-real change, the malformed onClickAlert is just dropped, not fatal.
    expect(sanitizeAction({ reply: "ok", html: "<p>hi</p>", onClickAlert: { message: "hi" } }).onClickAlert).toBeNull();
  });

  it("returns null when the action has no usable effect", () => {
    expect(sanitizeAction({ reply: "ok", html: null, css: null, onClickAlert: null })).toBeNull();
    expect(sanitizeAction({})).toBeNull();
    expect(sanitizeAction(null)).toBeNull();
    expect(sanitizeAction("not an object")).toBeNull();
  });

  it("caps overly long strings", () => {
    const action = sanitizeAction({ reply: "x".repeat(1000), html: "y".repeat(50000) });
    expect(action.reply.length).toBeLessThanOrEqual(300);
    expect(action.html.length).toBeLessThanOrEqual(40000);
  });
});

describe("getAiStatus", () => {
  it("reports not configured when no key is present", () => {
    expect(getAiStatus({})).toEqual({ configured: false, model: "poolside/laguna-s-2.1:free" });
  });

  it("reports configured when a key is present, with model override", () => {
    expect(getAiStatus({ OPENROUTER_API_KEY: "abc", OPENROUTER_MODEL: "some/model:free" })).toEqual({
      configured: true,
      model: "some/model:free",
    });
  });
});
