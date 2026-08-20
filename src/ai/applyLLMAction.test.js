import { describe, it, expect } from "vitest";
import { applyLLMAction } from "./applyLLMAction.js";
import { annotateForPreview } from "../utils/domIds.js";

const html = `<section data-vibe-section="hero"><h1 class="hero__title">Fast, reliable plumbing for your home</h1></section>`;
const css = `:root { --brand: #16a34a; --brand-dark: #15803d; }`;

function selectedElementFor(html) {
  const annotated = annotateForPreview(html);
  const idMatch = annotated.match(/<h1[^>]*data-vibe-id="(v\d+)"/);
  return { vibeId: idMatch[1], tag: "h1", text: "Fast, reliable plumbing for your home" };
}

describe("applyLLMAction", () => {
  it("applies a text replacement to the selected element", () => {
    const selectedElement = selectedElementFor(html);
    const result = applyLLMAction(
      { reply: "Shortened it.", textReplacement: "Fast plumbing", styleChanges: {} },
      { html, css, selectedElement }
    );
    expect(result).not.toBeNull();
    expect(result.html).toContain("Fast plumbing");
    expect(result.html).not.toContain("Fast, reliable plumbing for your home");
  });

  it("applies style changes to the selected element", () => {
    const selectedElement = selectedElementFor(html);
    const result = applyLLMAction(
      { reply: "Rounded it.", styleChanges: { borderRadius: "16px" } },
      { html, css, selectedElement }
    );
    expect(result.html).toContain("border-radius");
  });

  it("removes the selected element", () => {
    const selectedElement = selectedElementFor(html);
    const result = applyLLMAction({ reply: "Removed it.", remove: true, styleChanges: {} }, { html, css, selectedElement });
    expect(result.html).not.toContain("<h1");
  });

  it("falls back to targetHint when nothing is selected", () => {
    const result = applyLLMAction(
      { reply: "Bolded the heading.", styleChanges: { fontWeight: "800" }, targetHint: ".hero__title" },
      { html, css, selectedElement: null }
    );
    expect(result.html).toContain("font-weight");
  });

  it("falls back to the hero section when targetHint doesn't match", () => {
    const result = applyLLMAction(
      { reply: "ok", styleChanges: { fontWeight: "800" }, targetHint: ".does-not-exist" },
      { html, css, selectedElement: null }
    );
    expect(result).not.toBeNull();
  });

  it("updates the brand color css variable for page-wide requests", () => {
    const result = applyLLMAction({ reply: "Darker green.", brandColorHex: "#0f5c2e" }, { html, css, selectedElement: null });
    expect(result.css).toContain("--brand: #0f5c2e");
  });

  it("returns null for an empty/no-op action", () => {
    const result = applyLLMAction({ reply: "ok", styleChanges: {} }, { html, css, selectedElement: null });
    expect(result).toBeNull();
  });

  it("returns null when given no action", () => {
    expect(applyLLMAction(null, { html, css, selectedElement: null })).toBeNull();
  });
});
