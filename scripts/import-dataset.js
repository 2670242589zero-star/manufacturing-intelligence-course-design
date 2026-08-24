const path = require("node:path");
const fsp = require("node:fs/promises");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"]);

async function collectImages(root, current = root, result = []) {
  for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) await collectImages(root, fullPath, result);
    else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const stat = await fsp.stat(fullPath);
      result.push({
        relativePath: path.relative(root, fullPath).replaceAll("\\", "/"),
        className: path.relative(root, path.dirname(fullPath)).split(path.sep)[0] || "unclassified",
        bytes: stat.size
      });
    }
  }
  return result;
}

async function buildManifest(source, datasetId = "local-images") {
  const absoluteSource = path.resolve(source);
  const images = await collectImages(absoluteSource);
  const classes = images.reduce((counts, image) => {
    counts[image.className] = (counts[image.className] || 0) + 1;
    return counts;
  }, {});
  return { datasetId, source: absoluteSource, generatedAt: new Date().toISOString(), imageCount: images.length, classes, images };
}

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const idIndex = process.argv.indexOf("--dataset");
  if (sourceIndex < 0 || !process.argv[sourceIndex + 1]) throw new Error("Usage: node scripts/import-dataset.js --source <image-directory> [--dataset <id>]");
  const manifest = await buildManifest(process.argv[sourceIndex + 1], idIndex >= 0 ? process.argv[idIndex + 1] : undefined);
  const outputDir = path.join(__dirname, "..", "data", "local");
  await fsp.mkdir(outputDir, { recursive: true });
  await fsp.writeFile(path.join(outputDir, "dataset-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Imported " + manifest.imageCount + " images across " + Object.keys(manifest.classes).length + " classes.");
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { buildManifest, collectImages };
