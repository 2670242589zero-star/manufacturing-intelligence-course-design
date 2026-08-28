const test = require("node:test");
const assert = require("node:assert/strict");
const { RAW_HEADERS, parseRowSelector, preprocessText } = require("../scripts/preprocess-process-quality");

test("parses deterministic source-row selectors", () => {
  assert.deepEqual(parseRowSelector("1-3,7,9-10"), [1, 2, 3, 7, 9, 10]);
  assert.throws(() => parseRowSelector("0,2"), /Invalid row number/);
});

test("normalizes decimal commas, timestamps and flotation means", () => {
  const sourceRow = [
    "3/10/17 1.00", "55,2", "16,98", "3019,53", "557,434", "395,713", "10,0664", "1,74",
    "1,0", "2,0", "3,0", "4,0", "5,0", "6,0", "7,0",
    "10,0", "20,0", "30,0", "40,0", "50,0", "60,0", "70,0", "66,91", "1,31"
  ];
  const output = preprocessText(`${RAW_HEADERS.join(";")}\n${sourceRow.join(";")}\n`, [1]);
  const [headers, record] = output.trim().split("\n").map((line) => line.split(","));
  assert.equal(headers.length, 13);
  assert.equal(record[0], "MPQ-0001");
  assert.equal(record[1], "2017-03-10T01:00:00.000Z");
  assert.equal(record[9], "4.000");
  assert.equal(record[10], "40.000");
  assert.equal(record[12], "1.31");
});
