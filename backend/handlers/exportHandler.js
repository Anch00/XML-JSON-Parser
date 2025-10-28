const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");

function exportJSON(req, res) {
  const data = req.body.data || [];
  const outPath = path.join(__dirname, "..", "..", "output");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath);
  const filePath = path.join(outPath, "filtrirano.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  res.download(filePath);
}

function exportXML(req, res) {
  const data = req.body.data || [];
  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele(
    "filteredResults"
  );

  const appendValue = (parent, key, value, depth = 0) => {
    const tag = key.replace(/[^A-Za-z0-9_]/g, "_") || "field";
    if (key === "id" && depth === 0) return;
    if (value == null) {
      parent.ele(tag).txt("").up();
    } else if (Array.isArray(value)) {
      value.forEach((v) => {
        if (typeof v === "object") {
          const child = parent.ele(tag);
          Object.keys(v).forEach((vk) =>
            appendValue(child, vk, v[vk], depth + 1)
          );
          child.up();
        } else {
          parent.ele(tag).txt(String(v)).up();
        }
      });
    } else if (typeof value === "object") {
      const child = parent.ele(tag);
      Object.keys(value).forEach((vk) =>
        appendValue(child, vk, value[vk], depth + 1)
      );
      child.up();
    } else {
      parent.ele(tag).txt(String(value)).up();
    }
  };

  data.forEach((item, idx) => {
    const it = doc.ele("item");
    const itemId = item.id || item.ID || idx + 1;
    it.att("id", String(itemId));
    Object.keys(item).forEach((k) => {
      if (k === "id" || k === "ID") return;
      appendValue(it, k, item[k]);
    });
    it.up();
  });

  const xml = doc.end({ prettyPrint: true });
  const outPath = path.join(__dirname, "..", "..", "output");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath);
  const filePath = path.join(outPath, "filtrirano.xml");
  fs.writeFileSync(filePath, xml, "utf8");
  res.download(filePath);
}

function clearHandler(req, res) {
  // nothing to clear in stateless handlers; client should clear datastore if needed
  return res.json({ ok: true });
}

module.exports = { exportJSON, exportXML, clearHandler };
