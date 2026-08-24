const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fsp = require("node:fs/promises");
const { buildManifest } = require("../scripts/import-dataset");

test("builds an image manifest and ignores unsupported files", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "vision-dataset-"));
  await fsp.mkdir(path.join(root, "scratch"));
  await fsp.mkdir(path.join(root, "pitted-surface"));
  await fsp.writeFile(path.join(root, "scratch", "001.png"), "sample");
  await fsp.writeFile(path.join(root, "scratch", "002.jpg"), "sample");
  await fsp.writeFile(path.join(root, "pitted-surface", "001.bmp"), "sample");
  await fsp.writeFile(path.join(root, "labels.csv"), "ignored");
  const manifest = await buildManifest(root, "test-images");
  assert.equal(manifest.imageCount, 3);
  assert.deepEqual(manifest.classes, { "pitted-surface": 1, scratch: 2 });
  assert.equal(manifest.images.some((image) => image.relativePath.includes("labels.csv")), false);
  await fsp.rm(root, { recursive: true, force: true });
});
