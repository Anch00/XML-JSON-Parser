const fs = require("fs");

function safeKey(raw) {
  let s = String(raw || "").trim();
  s = s.replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[0-9]/.test(s)) s = "_" + s;
  if (s === "") s = "field";
  return s;
}

function safeTagName(raw) {
  return safeKey(raw);
}

function parseXmlFileSync(filePath, xml2js) {
  const xml = fs.readFileSync(filePath, "utf8");
  return new Promise((resolve, reject) => {
    xml2js.parseString(
      xml,
      { explicitArray: false, mergeAttrs: true, explicitCharkey: false },
      (err, result) => {
        if (err) return reject(err);
        resolve({ xml, result });
      }
    );
  });
}

function extractItems(parsed) {
  const rootKeys = Object.keys(parsed);
  if (rootKeys.length === 0)
    return { rootName: null, itemsName: "items", items: [] };
  const root = parsed[rootKeys[0]];
  for (const key of Object.keys(root)) {
    const val = root[key];
    if (Array.isArray(val))
      return { rootName: rootKeys[0], itemsName: key, items: val };
    if (typeof val === "object") {
      if (
        Object.keys(val).length > 0 &&
        Object.values(val).every(
          (v) => typeof v === "object" || typeof v === "string"
        )
      ) {
        return {
          rootName: rootKeys[0],
          itemsName: key,
          items: Array.isArray(val) ? val : [val],
        };
      }
    }
  }
  if (Array.isArray(root))
    return { rootName: rootKeys[0], itemsName: rootKeys[0], items: root };
  const candidateItems = [];
  for (const key of Object.keys(root)) {
    const val = root[key];
    if (typeof val === "object") candidateItems.push(val);
  }
  if (candidateItems.length > 0)
    return { rootName: rootKeys[0], itemsName: "items", items: candidateItems };
  return { rootName: rootKeys[0], itemsName: "items", items: [] };
}

function inferFields(items) {
  const fields = new Set();
  items.forEach((it) => {
    if (typeof it === "object") Object.keys(it).forEach((k) => fields.add(k));
  });
  return Array.from(fields);
}

module.exports = {
  safeKey,
  safeTagName,
  parseXmlFileSync,
  extractItems,
  inferFields,
};
