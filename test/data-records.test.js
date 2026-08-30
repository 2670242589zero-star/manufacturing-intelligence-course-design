const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

test("keeps the preprocessing index aligned with the committed sample", async () => {
  const sample = await fsp.readFile(path.join(projectRoot, "data", "process-quality-sample.csv"), "utf8");
  const index = JSON.parse(await fsp.readFile(path.join(projectRoot, "data", "process-quality-index.json"), "utf8"));
  const digest = crypto.createHash("sha256").update(sample.replaceAll("\r\n", "\n")).digest("hex");
  assert.equal(index.source.sha256, "35fd3bea70843d59f14845a415ab7567744b4dbf75e6b9b64a9ad8a6293ca9cf");
  assert.deepEqual(index.source.selectedRows, [1, 2, 3, 4, 188, 189, 190, 191, 192, 193]);
  assert.equal(index.output.sha256, digest);
  assert.equal(index.output.recordCount, 10);
  assert.equal(index.output.columnCount, 13);
});

test("keeps dataset metadata, schema and prompt records parseable", async () => {
  const files = [
    path.join(projectRoot, "data", "dataset-sources.json"),
    path.join(projectRoot, "data", "process-quality-schema.json"),
    path.join(projectRoot, "prompt", "2026-08-26-stage-03-data-and-prompt.json"),
    path.join(projectRoot, "prompt", "2026-08-28-stage-03-public-dataset.json"),
    path.join(projectRoot, "prompt", "2026-08-29-stage-06-yolo-inference.json")
  ];
  const parsed = [];
  for (const file of files) {
    parsed.push(JSON.parse(await fsp.readFile(file, "utf8")));
  }
  assert.equal(parsed[0].datasets.some((item) => item.id === "mining-process-quality"), true);
  assert.equal(parsed[1].required.includes("sample_id"), true);
  assert.equal(parsed[2].harness, "Codex");
  assert.equal(parsed[2].model, "GPT-5.6sol");
  assert.equal(parsed[3].harness, "Codex");
  assert.equal(parsed[3].model, "GPT-5.6sol");
  assert.equal(parsed[3].sourceDataset.license, "CC0: Public Domain");
  assert.equal(parsed[4].status, "ready_for_publish");
  assert.equal(parsed[4].verification.tests, "19/19 passed");
});

test("documents public dataset citations and publication target", async () => {
  const readme = await fsp.readFile(path.join(projectRoot, "README.md"), "utf8");
  const dataReadme = await fsp.readFile(path.join(projectRoot, "data", "README.md"), "utf8");
  const card = await fsp.readFile(path.join(projectRoot, "data", "process-quality-publication-card.md"), "utf8");
  const sources = JSON.parse(await fsp.readFile(path.join(projectRoot, "data", "dataset-sources.json"), "utf8"));
  const miningUrl = "https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process";
  const sampleUrl = "https://github.com/2670242589zero-star/manufacturing-intelligence-course-design/blob/main/data/process-quality-sample.csv";
  assert.ok(readme.includes(miningUrl));
  assert.ok(dataReadme.includes(miningUrl));
  assert.ok(card.includes(miningUrl));
  assert.ok(readme.includes(sampleUrl));
  assert.equal(sources.datasets.find((item) => item.id === "mining-process-quality").license, "CC0: Public Domain");
  assert.equal(sources.datasets.find((item) => item.id === "manufacturing-quality-process-sample").url, sampleUrl);
});
