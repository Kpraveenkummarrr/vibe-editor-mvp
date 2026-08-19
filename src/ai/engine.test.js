import { describe, it, expect } from "vitest";
import { classifyIntent } from "./intentParser.js";
import { applyIntent } from "./applyAction.js";
import { processPrompt } from "./engine.js";
import { annotateForPreview } from "../utils/domIds.js";

const html = `<section data-vibe-section="hero"><h1 class="hero__title">Fast, reliable plumbing for your home</h1></section>`;
const css = `:root { --brand: #16a34a; --brand-dark: #15803d; }`;

describe("classifyIntent", () => {
  it("detects darker color requests", () => {
    expect(classifyIntent("Use a darker green").type).toBe("color_adjust");
  });

  it("detects shorten requests", () => {
    expect(classifyIntent("Shorten the headline").type).toBe("text_shorten");
  });

  it("detects premium styling requests", () => {
    expect(classifyIntent("Make the hero more premium").type).toBe("style_premium");
  });

  it("falls back to generic polish for unrecognized prompts", () => {
    expect(classifyIntent("do something wonderful").type).toBe("generic_polish");
  });
});

describe("applyIntent", () => {
  it("shortens the heading text of the hero title", () => {
    const result = applyIntent(
      { type: "text_shorten" },
      { html, css, selectedVibeId: null, targetSelector: ".hero__title, h1" }
    );
    expect(result).not.toBeNull();
    expect(result.html).toContain("<h1");
    expect(result.html.length).toBeLessThan(html.length);
  });

  it("darkens the brand css variable when nothing is selected", () => {
    const result = applyIntent(
      { type: "color_adjust", direction: "darken", colorWord: null },
      { html, css, selectedVibeId: null, targetSelector: null }
    );
    expect(result.css).toContain("--brand:");
    expect(result.css).not.toContain("--brand: #16a34a");
  });

  it("targets a specific selected element via vibe id", () => {
    const annotated = annotateForPreview(html);
    const idMatch = annotated.match(/data-vibe-id="(v\d+)"/);
    expect(idMatch).not.toBeNull();
    const result = applyIntent(
      { type: "color_set", colorWord: "blue" },
      { html, css, selectedVibeId: idMatch[1], targetSelector: null }
    );
    expect(result.html).toContain("background-color");
  });
});

describe("processPrompt", () => {
  it("returns a reply and updated files for a recognized prompt", async () => {
    const result = await processPrompt({
      prompt: "Make the hero more premium",
      files: { html, css },
      selectedElement: null,
    });
    expect(result.files).not.toBeNull();
    expect(result.reply).toMatch(/done/i);
  });

  it("asks for input when the prompt is empty", async () => {
    const result = await processPrompt({ prompt: "   ", files: { html, css }, selectedElement: null });
    expect(result.files).toBeNull();
  });
});
