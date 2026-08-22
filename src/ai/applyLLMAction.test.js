import { describe, it, expect } from "vitest";
import { applyLLMAction } from "./applyLLMAction.js";
import { annotateForPreview } from "../utils/domIds.js";

const html = `<section data-vibe-section="hero"><h1 class="hero__title">Fast, reliable plumbing for your home</h1></section>`;
const css = `:root { --brand: #16a34a; --brand-dark: #15803d; }`;

function vibeIdFor(annotatedTag, sourceHtml = html) {
  const annotated = annotateForPreview(sourceHtml);
  const match = annotated.match(new RegExp(`<${annotatedTag}[^>]*data-vibe-id="(v\\d+)"`));
  return match[1];
}

describe("applyLLMAction", () => {
  it("applies a full HTML replacement, stripping vibe-ids before storage", () => {
    const annotated = annotateForPreview(html);
    const result = applyLLMAction({ reply: "Shortened it.", html: annotated.replace("Fast, reliable plumbing for your home", "Fast plumbing"), css: null }, { html, css });
    expect(result).not.toBeNull();
    expect(result.html).toContain("Fast plumbing");
    expect(result.html).not.toContain("data-vibe-id");
  });

  it("applies a CSS-only change, leaving HTML untouched", () => {
    const result = applyLLMAction({ reply: "Rounded it.", html: null, css: `${css}\n.hero { border-radius: 16px; }` }, { html, css });
    expect(result).not.toBeNull();
    expect(result.html).toBe(html);
    expect(result.css).toContain("border-radius");
  });

  it("rejects a response with no html, css, or onClickAlert", () => {
    expect(applyLLMAction({ reply: "ok", html: null, css: null, onClickAlert: null }, { html, css })).toBeNull();
  });

  it("rejects an html response that parses to nothing", () => {
    expect(applyLLMAction({ reply: "ok", html: "   ", css: null }, { html, css })).toBeNull();
  });

  it("returns null when given no action", () => {
    expect(applyLLMAction(null, { html, css })).toBeNull();
  });

  it("resolves vibe-asset: placeholders against the real uploaded asset", () => {
    const vibeId = vibeIdFor("h1");
    const annotated = annotateForPreview(html);
    const withImg = annotated.replace("</section>", '<img src="vibe-asset:hero-photo.jpg" /></section>');
    const assets = [{ name: "hero-photo.jpg", dataUrl: "data:image/jpeg;base64,AAAA" }];
    const result = applyLLMAction({ reply: "Added the photo.", html: withImg, css: null }, { html, css, assets });
    expect(result.html).toContain("data:image/jpeg;base64,AAAA");
    expect(result.html).not.toContain("vibe-asset:");
    expect(vibeId).toBeTruthy(); // sanity: fixture id resolution itself works
  });

  it("drops an unmatched vibe-asset: image reference rather than leaving a fake src, and treats a fully-reverted no-op as a no-op", () => {
    const annotated = annotateForPreview(html);
    const withImg = annotated.replace("</section>", '<img src="vibe-asset:does-not-exist.jpg" /></section>');
    // The only content the model added was an image referencing an asset
    // name that doesn't exist; once that's stripped out, the page is back
    // to exactly what it already was — same treatment as any other no-op.
    const result = applyLLMAction({ reply: "ok", html: withImg, css: null }, { html, css, assets: [] });
    expect(result).toBeNull();
  });

  it("drops an unmatched vibe-asset: image reference while still applying a real, separate change", () => {
    const annotated = annotateForPreview(html);
    const withImg = annotated
      .replace("Fast, reliable plumbing for your home", "Fast plumbing")
      .replace("</section>", '<img src="vibe-asset:does-not-exist.jpg" /></section>');
    const result = applyLLMAction({ reply: "ok", html: withImg, css: null }, { html, css, assets: [] });
    expect(result).not.toBeNull();
    expect(result.html).toContain("Fast plumbing");
    expect(result.html).not.toContain("vibe-asset:");
    expect(result.html).not.toContain("<img");
  });

  it("appends a click-alert handler to script.js using a persisted hook, not the ephemeral vibe-id", () => {
    const targetVibeId = vibeIdFor("h1");
    const result = applyLLMAction(
      { reply: "Added a welcome alert.", html: null, css: null, onClickAlert: { targetVibeId, message: "Welcome home!" } },
      { html, css, js: "// existing script" }
    );
    expect(result).not.toBeNull();
    expect(result.js).toContain("// existing script");
    expect(result.js).toContain("Welcome home!");
    expect(result.js).not.toMatch(/data-vibe-id/);
    expect(result.html).toMatch(/data-vibe-hook="[^"]+"/);
    const hook = result.html.match(/data-vibe-hook="([^"]+)"/)[1];
    expect(result.js).toContain(hook);
  });

  it("reuses a real id instead of minting a hook when the element already has one", () => {
    const idHtml = `<section data-vibe-section="hero"><button id="home-btn">Home</button></section>`;
    const targetVibeId = vibeIdFor("button", idHtml);
    const result = applyLLMAction(
      { reply: "Added an alert.", html: null, css: null, onClickAlert: { targetVibeId, message: "Hi!" } },
      { html: idHtml, css }
    );
    expect(result).not.toBeNull();
    expect(result.html).not.toContain("data-vibe-hook");
    expect(result.js).toContain("#home-btn");
  });

  it("silently no-ops an onClickAlert whose targetVibeId doesn't exist", () => {
    const result = applyLLMAction({ reply: "ok", html: null, css: null, onClickAlert: { targetVibeId: "v999", message: "hi" } }, { html, css });
    expect(result).toBeNull();
  });
});
