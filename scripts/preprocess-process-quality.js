const crypto = require("node:crypto");
const path = require("node:path");
const fsp = require("node:fs/promises");

const SOURCE_URL = "https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process";
const DEFAULT_ROW_SELECTOR = "1-4,188-193";

const RAW_HEADERS = [
  "date", "% Iron Feed", "% Silica Feed", "Starch Flow", "Amina Flow", "Ore Pulp Flow",
  "Ore Pulp pH", "Ore Pulp Density", "Flotation Column 01 Air Flow",
  "Flotation Column 02 Air Flow", "Flotation Column 03 Air Flow", "Flotation Column 04 Air Flow",
  "Flotation Column 05 Air Flow", "Flotation Column 06 Air Flow", "Flotation Column 07 Air Flow",
  "Flotation Column 01 Level", "Flotation Column 02 Level", "Flotation Column 03 Level",
  "Flotation Column 04 Level", "Flotation Column 05 Level", "Flotation Column 06 Level",
  "Flotation Column 07 Level", "% Iron Concentrate", "% Silica Concentrate"
];

const OUTPUT_HEADERS = [
  "sample_id", "timestamp", "iron_feed_pct", "silica_feed_pct", "starch_flow", "amina_flow",
  "ore_pulp_flow", "ore_pulp_ph", "ore_pulp_density", "flotation_air_flow_avg",
  "flotation_level_avg", "iron_concentrate_pct", "silica_concentrate_pct"
];

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function parseRowSelector(selector) {
  const rows = new Set();
  for (const part of selector.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start) throw new Error(`Invalid row range: ${token}`);
      for (let row = start; row <= end; row += 1) rows.add(row);
      continue;
    }
    if (!/^\d+$/.test(token) || Number(token) < 1) throw new Error(`Invalid row number: ${token}`);
    rows.add(Number(token));
  }
  if (rows.size === 0) throw new Error("At least one source row must be selected");
  return [...rows].sort((a, b) => a - b);
}

function parseLocaleNumber(value, fieldName) {
  const parsed = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value for ${fieldName}: ${value}`);
  return parsed;
}

function parseTimestamp(value) {
  const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s+(\d{1,2})\.(\d{2})$/);
  if (!match) throw new Error(`Unsupported source timestamp: ${value}`);
  const [, month, day, sourceYear, hour, minute] = match;
  const year = sourceYear.length === 2 ? 2000 + Number(sourceYear) : Number(sourceYear);
  return new Date(Date.UTC(year, Number(month) - 1, Number(day), Number(hour), Number(minute))).toISOString();
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fixed(value, decimals) {
  return Number(value).toFixed(decimals);
}

function normalizeRecord(fields, sampleNumber, sourceRowNumber) {
  if (fields.length !== RAW_HEADERS.length) {
    throw new Error(`Source row ${sourceRowNumber} has ${fields.length} fields; expected ${RAW_HEADERS.length}`);
  }
  const numberAt = (index) => parseLocaleNumber(fields[index], RAW_HEADERS[index]);
  const airFlow = fields.slice(8, 15).map((value, index) => parseLocaleNumber(value, RAW_HEADERS[index + 8]));
  const level = fields.slice(15, 22).map((value, index) => parseLocaleNumber(value, RAW_HEADERS[index + 15]));
  return [
    `MPQ-${String(sampleNumber).padStart(4, "0")}`,
    parseTimestamp(fields[0]),
    fixed(numberAt(1), 1),
    fixed(numberAt(2), 2),
    fixed(numberAt(3), 2),
    fixed(numberAt(4), 3),
    fixed(numberAt(5), 3),
    fixed(numberAt(6), 4),
    fixed(numberAt(7), 5),
    fixed(mean(airFlow), 3),
    fixed(mean(level), 3),
    fixed(numberAt(22), 2),
    fixed(numberAt(23), 2)
  ];
}

function preprocessText(rawText, selectedRows) {
  const lines = rawText.trim().split(/\r?\n/);
  const headers = lines[0].split(";").map((header) => header.trim());
  if (headers.length !== RAW_HEADERS.length || headers.some((header, index) => header !== RAW_HEADERS[index])) {
    throw new Error("Source headers do not match the expected mining-process schema");
  }
  const records = selectedRows.map((sourceRowNumber, index) => {
    const sourceLine = lines[sourceRowNumber];
    if (!sourceLine) throw new Error(`Selected source row ${sourceRowNumber} does not exist`);
    return normalizeRecord(sourceLine.split(";"), index + 1, sourceRowNumber);
  });
  return [OUTPUT_HEADERS.join(","), ...records.map((record) => record.join(","))].join("\n") + "\n";
}

function buildIndex({ rawText, outputText, inputPath, outputPath, schemaPath, selectedRows }) {
  return {
    schemaVersion: 1,
    datasetId: "manufacturing-quality-process-sample",
    description: "A 10-row educational sample derived from a CC0 public dataset.",
    source: {
      name: "Quality Prediction in a Mining Process",
      url: SOURCE_URL,
      license: "CC0: Public Domain",
      localMirror: inputPath.replaceAll("\\", "/"),
      sha256: sha256(rawText),
      recordCount: rawText.trim().split(/\r?\n/).length - 1,
      selectedRows,
      rowNumbering: "1-based data rows; header excluded"
    },
    preprocessing: {
      script: "scripts/preprocess-process-quality.js",
      command: "npm run dataset:preprocess",
      rowSelector: selectedRows.join(","),
      transformations: [
        "parse semicolon-delimited rows",
        "convert decimal commas to decimal points",
        "convert month/day/year hour.minute timestamps to UTC ISO 8601",
        "select representative process and quality fields",
        "average seven flotation air-flow columns",
        "average seven flotation level columns",
        "add deterministic MPQ sample identifiers"
      ]
    },
    output: {
      file: outputPath.replaceAll("\\", "/"),
      schema: schemaPath.replaceAll("\\", "/"),
      sha256: sha256(outputText),
      recordCount: outputText.trim().split(/\r?\n/).length - 1,
      columnCount: OUTPUT_HEADERS.length,
      target: "silica_concentrate_pct",
      leakageRiskField: "iron_concentrate_pct"
    },
    usageBoundary: "The sample is for teaching, API integration and preprocessing verification, not production performance claims."
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const name = argv[index].slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    options[name] = value;
    index += 1;
  }
  return options;
}

async function main() {
  const projectRoot = path.join(__dirname, "..");
  const options = parseArgs(process.argv.slice(2));
  const input = path.resolve(projectRoot, options.input || "data/local/mining-mirror-a/Book1.csv");
  const output = path.resolve(projectRoot, options.output || "data/process-quality-sample.csv");
  const indexPath = path.resolve(projectRoot, options.index || "data/process-quality-index.json");
  const schema = path.resolve(projectRoot, options.schema || "data/process-quality-schema.json");
  const selectedRows = parseRowSelector(options.rows || DEFAULT_ROW_SELECTOR);
  const rawText = await fsp.readFile(input, "utf8");
  const outputText = preprocessText(rawText, selectedRows);
  const relative = (file) => path.relative(projectRoot, file);
  const index = buildIndex({ rawText, outputText, inputPath: relative(input), outputPath: relative(output), schemaPath: relative(schema), selectedRows });
  await fsp.mkdir(path.dirname(output), { recursive: true });
  await fsp.writeFile(output, outputText, "utf8");
  await fsp.writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(`Wrote ${index.output.recordCount} rows to ${relative(output)} and ${relative(indexPath)}.`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { DEFAULT_ROW_SELECTOR, OUTPUT_HEADERS, RAW_HEADERS, buildIndex, normalizeRecord, parseRowSelector, parseTimestamp, preprocessText, sha256 };
