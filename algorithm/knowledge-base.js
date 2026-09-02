const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_FILE = path.join(__dirname, "..", "knowledge", "entries.json");

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== undefined && item !== null).map(String) : [];
}

function createKnowledgeBase(options = {}) {
  const filePath = options.filePath || DEFAULT_FILE;
  const entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("knowledge_base_empty");
  const indexed = entries.map((entry) => ({
    ...entry,
    searchText: [entry.title, ...(entry.tags || []), ...(entry.defectTypes || []), ...(entry.processSignals || [])].map(normalize).join(" ")
  }));

  function search(filters = {}) {
    const query = normalize(filters.query);
    const defectTypes = asArray(filters.defectTypes).map(normalize);
    const processSignals = asArray(filters.processSignals).map(normalize);
    const riskLevel = normalize(filters.riskLevel);
    const tokens = [query, ...defectTypes, ...processSignals].filter(Boolean);
    const limit = Math.min(Math.max(Number(filters.limit) || 6, 1), 20);
    const matches = indexed.map((entry) => {
      const reasons = [];
      let score = 0;
      for (const token of tokens) {
        if (entry.searchText.includes(token)) {
          score += token === query ? 5 : 3;
          reasons.push("命中“" + token + "”");
        }
      }
      if (riskLevel && entry.applicableRiskLevels?.includes(riskLevel)) {
        score += 2;
        reasons.push("适用风险等级“" + riskLevel + "”");
      }
      if (!tokens.length && !riskLevel) score = 1;
      return { entry, score, reasons: [...new Set(reasons)] };
    }).filter((item) => item.score > 0 && (!riskLevel || item.entry.applicableRiskLevels?.includes(riskLevel)))
      .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
      .slice(0, limit);

    return {
      query: filters.query || "",
      count: matches.length,
      matches: matches.map(({ entry, score, reasons }) => ({ ...entry, score, matchReasons: reasons, searchText: undefined }))
    };
  }

  return { entries: indexed.map(({ searchText, ...entry }) => entry), search };
}

module.exports = { createKnowledgeBase };
