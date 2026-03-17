import { describe, expect, it } from "vitest";
import { buildAiId } from "./identifiers";

describe("buildAiId", () => {
  it("builds normalized ai id path", () => {
    expect(buildAiId(["Project", "Project List", "Header", "New Button", "Click"])).toBe(
      "project.project-list.header.new-button.click",
    );
  });

  it("ignores empty parts", () => {
    expect(buildAiId(["task", "", undefined, "panel", "open"])).toBe("task.panel.open");
  });
});

