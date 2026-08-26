const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fsp = require("node:fs/promises");

const projectRoot = path.join(__dirname, "..");

test("keeps the stage 3 public process sample structurally valid", async () => {
  const raw = await fsp.readFile(path.join(projectRoot, "data", "process-quality-sample.csv"), "utf8");
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  assert.equal(lines.length, 11);
  assert.equal(headers.length, 13);
  assert.ok(headers.includes("sample_id"));
  assert.ok(headers.includes("silica_concentrate_pct"));
  for (const line of lines.slice(1)) {
    assert.equal(line.split(",").length, headers.length);
  }
});

test("keeps dataset metadata, schema and prompt records parseable", async () => {
  const files = [
    path.join(projectRoot, "data", "dataset-sources.json"),
    path.join(projectRoot, "data", "process-quality-schema.json"),
    path.join(projectRoot, "prompt", "2026-08-26-stage-03-data-and-prompt.json")
  ];
  const parsed = [];
  for (const file of files) {
    parsed.push(JSON.parse(await fsp.readFile(file, "utf8")));
  }
  assert.equal(parsed[0].datasets.some((item) => item.id === "mining-process-quality"), true);
  assert.equal(parsed[1].required.includes("sample_id"), true);
  assert.equal(parsed[2].harness, "Codex");
  assert.equal(parsed[2].model, "GPT-5.6sol");
});
