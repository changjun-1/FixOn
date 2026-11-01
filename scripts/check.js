const fs = require("fs");
const path = require("path");
const cp = require("child_process");
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith(".js"))
      cp.execFileSync(process.execPath, ["--check", p], { stdio: "inherit" });
  }
}
walk(path.resolve(__dirname, ".."));
console.log("모든 JavaScript 구문 검사 통과");
