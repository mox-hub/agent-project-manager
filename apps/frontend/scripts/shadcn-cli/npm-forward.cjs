// npm → pnpm 转发垫片：shadcn CLI 在 pnpm workspace 中误判包管理器时，
// 把它的 npm install/add 调用安全转发给 pnpm（限定前端 workspace 目录）
const { spawnSync } = require("child_process");
const { appendFileSync } = require("fs");
const path = require("path");

const args = process.argv.slice(2);
appendFileSync(__dirname + "/shim-calls.log", `CALLED: ${JSON.stringify(args)}\n`);
// 前端 workspace 根（垫片位于 apps/frontend/scripts/shadcn-cli/，向上两级）
const FE_DIR = path.resolve(__dirname, "..", "..");

let cmdArgs;
if (args[0] === "install" || args[0] === "i" || args[0] === "add") {
  const pkgs = args.slice(1).filter((a) => !a.startsWith("-"));
  cmdArgs = ["--dir", FE_DIR, "add", ...pkgs];
} else {
  cmdArgs = ["--dir", FE_DIR, ...args];
}

const r = spawnSync("pnpm", cmdArgs, { stdio: "inherit", shell: true });
process.exit(r.status ?? 1);
