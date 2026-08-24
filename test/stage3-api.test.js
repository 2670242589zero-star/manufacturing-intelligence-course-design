const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../server");

test("exposes model adapter status and public dataset source metadata", async () => {
  const server = createServer({ inferenceOptions: { endpoint: "" } });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const statusResponse = await fetch(baseUrl + "/api/model-status");
  const sourcesResponse = await fetch(baseUrl + "/api/dataset-sources");
  const status = await statusResponse.json();
  const sources = await sourcesResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(status.configuredMode, "local");
  assert.equal(sources.datasets.length, 3);
  assert.ok(sources.datasets.every((item) => item.url.startsWith("http")));
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
