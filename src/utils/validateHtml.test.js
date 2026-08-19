import { describe, it, expect } from "vitest";
import { validateProject } from "./validateHtml.js";

describe("validateProject", () => {
  it("returns no issues for clean markup", () => {
    const issues = validateProject({
      html: `<h1>Title</h1><img src="a.png" alt="A" /><a href="#services">Services</a>`,
      css: `h1 { color: red; }`,
    });
    expect(issues).toHaveLength(0);
  });

  it("flags images missing alt text", () => {
    const issues = validateProject({ html: `<img src="a.png" />`, css: "" });
    expect(issues.some((i) => i.message.includes("alt"))).toBe(true);
  });

  it("flags empty or placeholder links", () => {
    const issues = validateProject({ html: `<a href="#">Click</a>`, css: "" });
    expect(issues.some((i) => i.message.includes("href"))).toBe(true);
  });

  it("flags duplicate ids", () => {
    const issues = validateProject({ html: `<div id="x"></div><div id="x"></div>`, css: "" });
    expect(issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  it("flags mismatched css braces", () => {
    const issues = validateProject({ html: `<h1>Title</h1>`, css: `h1 { color: red;` });
    expect(issues.some((i) => i.message.includes("braces"))).toBe(true);
  });
});
