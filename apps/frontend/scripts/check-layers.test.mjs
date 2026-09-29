import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { LAYER_BASELINE, runChecks } from "./check-layers.mjs";

/**
 * check-layers.mjs 单元测试 —— G 类依赖矩阵 R1/R2/R3/R6 正反探针 + 存量基线不回归。
 *
 * 对应方案：docs/design/修改方案-G类-分层解耦-2026-09-29.md §2.2（裁决 G3：R1–R6
 * 落地即 error）；存量「ui → modules」基线已于 2026-09-29 随裁决 G7 倒置收编迁出 ui/ 清零，
 * 真实树存量 0 不回归。
 *
 * fixture 纪律：临时根目录一律建在 os.tmpdir()——vitest 会扫 gitignored 目录，
 * 写进真实 src/ 树一旦漏删会污染后续跑测；此处 afterAll 统一递归删除，零残留。
 * runChecks(pkgRoot) 是纯函数（不打印、不退出），fixture 只写假 .tsx/.ts 文本即可。
 */

/** 本轮创建的全部临时根目录，afterAll 统一清理 */
const tmpRoots = [];

afterAll(() => {
  for (const root of tmpRoots) rmSync(root, { recursive: true, force: true });
});

/** 在 os.tmpdir() 建一个随机 fixture 根，write(rel, content) 自动补目录 */
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "apm-check-layers-"));
  tmpRoots.push(root);
  const write = (rel, content = "") => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  };
  return { root, write };
}

describe("check-layers：G 类依赖矩阵（R1/R2/R3/R6，违例即 error）", () => {
  describe("R1 业务面不得 import components/raw", () => {
    it("正探针：modules / shared / app 三棵树、别名与相对路径双形态均检出", () => {
      const { root, write } = makeFixture();
      write("src/components/raw/raw-button.tsx", 'import type * as React from "react"\nexport {};\n');
      write("src/components/raw/raw-input.tsx", "export {};\n");
      write("src/components/ui/placeholder.tsx", "export {};\n");
      write("src/components/semantic/placeholder.tsx", "export {};\n");
      write("src/modules/m1/page.tsx", 'import { RawButton } from "@/components/raw/raw-button";\nexport {};\n');
      write(
        "src/modules/m2/deep/rel.ts",
        'import x from "../../../components/raw/raw-input";\nexport default x;\n',
      );
      write("src/shared/hooks/use-thing.ts", 'import "@/components/raw/raw-button";\n');
      write("src/app/page.tsx", 'import { RawButton } from "@/components/raw/raw-button";\nexport default 1;\n');

      const res = runChecks(root);
      expect(res.missingDirs).toEqual([]);
      expect(res.g.r1.map((h) => h.key).sort()).toEqual(
        [
          "src/modules/m1/page.tsx → @/components/raw/raw-button",
          "src/modules/m2/deep/rel.ts → ../../../components/raw/raw-input",
          "src/shared/hooks/use-thing.ts → @/components/raw/raw-button",
          "src/app/page.tsx → @/components/raw/raw-button",
        ].sort(),
      );
    });

    it("负探针：import ui / semantic / @lib / 形近路径与裸包名不误报", () => {
      const { root, write } = makeFixture();
      // 合法：业务面走 ui / semantic；@/lib 工具合法
      write(
        "src/modules/ok/page.tsx",
        [
          'import { Button } from "@/components/ui/button";',
          'import { Card } from "@/components/semantic/card";',
          'import { cn } from "@/lib/utils";',
          "export {};",
        ].join("\n"),
      );
      // 形近不误报：modules 内自己的 raw-utils 目录、raw-x 形近目录、裸包名
      write('src/modules/ok/lookalike.ts', 'import h from "./raw-utils/helper";\nimport p from "raw-http";\nimport q from "@/components/raw-x/lookalike";\nexport default [h, p, q];\n');
      write("src/modules/ok/raw-utils/helper.ts", "export {};\n");

      const res = runChecks(root);
      expect(res.g.r1).toHaveLength(0);
    });
  });

  describe("R2 原语不得 import ui / semantic / modules", () => {
    it("正探针：raw → ui / semantic / modules 三方向均检出（含相对路径形态）", () => {
      const { root, write } = makeFixture();
      write(
        "src/components/raw/raw-bad.tsx",
        [
          'import { Button } from "@/components/ui/button";',
          'import { Card } from "../semantic/card";',
          'import { api } from "@/modules/m1/api";',
          "export {};",
        ].join("\n"),
      );
      // 负例：react 类型、@/lib 工具、目录内相对引用均为 R2 允许方向
      write(
        "src/components/raw/raw-good.tsx",
        [
          'import type * as React from "react";',
          'import { cn } from "@/lib/utils";',
          'import { sibling } from "./raw-sibling";',
          "export {};",
        ].join("\n"),
      );
      write("src/components/raw/raw-sibling.ts", "export const sibling = 1;\n");
      write("src/components/ui/button.tsx", "export {};\n");
      write("src/components/semantic/card.tsx", "export {};\n");
      write("src/modules/m1/api.ts", "export const api = 1;\n");

      const res = runChecks(root);
      expect(res.g.r2.map((h) => h.key).sort()).toEqual(
        [
          "src/components/raw/raw-bad.tsx → @/components/ui/button",
          "src/components/raw/raw-bad.tsx → ../semantic/card",
          "src/components/raw/raw-bad.tsx → @/modules/m1/api",
        ].sort(),
      );
      expect(res.g.r2.every((h) => h.rel === "src/components/raw/raw-bad.tsx")).toBe(true);
    });

    it("递归扫描子目录并排除 .test/.spec 文件", () => {
      const { root, write } = makeFixture();
      write("src/components/raw/nested/inner.tsx", 'import { Button } from "@/components/ui/button";\nexport {};\n');
      // 同目录下的 test/spec 同样含违例 import，但一律排除
      write("src/components/raw/nested/inner.test.tsx", 'import { Button } from "@/components/ui/button";\n');
      write("src/components/raw/nested/inner.spec.ts", 'import "@/modules/m1/api";\n');
      write("src/components/ui/button.tsx", "export {};\n");
      write("src/modules/m1/api.ts", "export const api = 1;\n");

      const res = runChecks(root);
      expect(res.g.r2.map((h) => h.rel)).toEqual(["src/components/raw/nested/inner.tsx"]);
      expect(res.g.r2[0].line).toBe(1);
    });
  });

  describe("R3 原子不得 import components/semantic", () => {
    it("正探针：ui → semantic（别名与相对路径）检出；负探针：ui → raw（R4 允许）/ ui → modules（走存量规则）不计 R3", () => {
      const { root, write } = makeFixture();
      write(
        "src/components/ui/atom.tsx",
        'import { Card } from "@/components/semantic/card";\nimport { Card2 } from "../semantic/card2";\nexport {};\n',
      );
      // ui→raw 是 R4 允许方向（只进观察指标）；ui→modules 属存量规则口径、不归 R3
      write(
        "src/components/ui/fine.tsx",
        'import { RawButton } from "@/components/raw/raw-button";\nimport { api } from "@/modules/m1/api";\nexport {};\n',
      );
      write("src/components/semantic/card.tsx", "export {};\n");
      write("src/components/semantic/card2.tsx", "export {};\n");
      write("src/components/raw/raw-button.tsx", "export {};\n");
      write("src/modules/m1/api.ts", "export const api = 1;\n");

      const res = runChecks(root);
      expect(res.g.r3).toHaveLength(2);
      expect(res.g.r3.every((h) => h.rel === "src/components/ui/atom.tsx")).toBe(true);
      expect(res.g.r3.map((h) => h.spec).sort()).toEqual(
        ["@/components/semantic/card", "../semantic/card2"].sort(),
      );
      // R4 观察指标：ui 内 import raw 的文件数 = 1（fine.tsx）
      expect(res.g.r4ObservedFiles).toBe(1);
    });
  });

  describe("R6 语义组件不得 import modules", () => {
    it("正探针：semantic → modules（别名与相对路径）检出且行号正确；负探针：semantic → raw / ui（R5 允许）不计 R6", () => {
      const { root, write } = makeFixture();
      write(
        "src/components/semantic/badge.tsx",
        'import { api } from "@/modules/m1/api";\nimport { api2 } from "../../modules/m1/api2";\nexport {};\n',
      );
      write(
        "src/components/semantic/fine.tsx",
        'import { RawButton } from "@/components/raw/raw-button";\nimport { Button } from "@/components/ui/button";\nexport {};\n',
      );
      write("src/components/raw/raw-button.tsx", "export {};\n");
      write("src/components/ui/button.tsx", "export {};\n");
      write("src/modules/m1/api.ts", "export const api = 1;\n");
      write("src/modules/m1/api2.ts", "export const api2 = 2;\n");

      const res = runChecks(root);
      expect(res.g.r6).toHaveLength(2);
      expect(res.g.r6.every((h) => h.rel === "src/components/semantic/badge.tsx")).toBe(true);
      expect(res.g.r6.map((h) => h.line)).toEqual([1, 2]);
    });
  });

  it("组件层目录缺失记入 missingDirs（CLI 壳据此 exit 1）", () => {
    const { root, write } = makeFixture();
    write("src/components/ui/a.tsx", "export {};\n");
    write("src/components/raw/b.tsx", "export {};\n");
    // semantic/ 故意不创建
    const res = runChecks(root);
    expect(res.missingDirs).toEqual(["src/components/semantic"]);
  });
});

describe("check-layers：存量基线不回归（真实仓库树）", () => {
  it("ui→modules 真实树存量 0（G7 倒置收编迁出后基线清空）；G 类 R1/R2/R3/R6 真实树零违例", () => {
    const res = runChecks(); // 默认 pkgRoot = 本仓库 apps/frontend

    // 目录齐备
    expect(res.missingDirs).toEqual([]);
    // 存量：基线已于 2026-09-29 随 G7 倒置收编迁出 ui/ 清零，真实树命中 0、新增 0、stale 0
    expect(LAYER_BASELINE).toHaveLength(0);
    expect(res.legacy.found).toHaveLength(0);
    expect(res.legacy.added).toHaveLength(0);
    expect(res.legacy.existing).toEqual([]);
    expect(res.legacy.stale).toEqual([]);

    // G 类新目录规则：真实树零违例（裁决 G3 的「零存量」前提持续成立）
    expect(res.g.r1).toHaveLength(0);
    expect(res.g.r2).toHaveLength(0);
    expect(res.g.r3).toHaveLength(0);
    expect(res.g.r6).toHaveLength(0);
  });
});
