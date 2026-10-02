import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const files = execFileSync("git", ["ls-files", "--cached", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
if (!files.length) throw new Error("Stage the release files first.");
const secrets = ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "SESSION_SECRET"].map(key => process.env[key]).filter(value => value && value.length >= 12);
for (const file of files) {
  if (file.startsWith(".env") && file !== ".env.example") throw new Error(`Private environment file staged: ${file}`);
  const bytes = readFileSync(file);
  if (secrets.some(value => bytes.includes(Buffer.from(value)))) throw new Error(`A configured secret appears in staged file: ${file}`);
  if (/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/.test(bytes.toString("utf8"))) throw new Error(`Possible secret token in staged file: ${file}`);
}
console.log(`Checked ${files.length} staged paths: no private environment files or configured secrets found.`);
