const express = require("express");
const multer = require("multer");
const xml2js = require("xml2js");
const { create } = require("xmlbuilder2");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

// In-memory storage of parsed documents
// { id: uniqueId, filename, rootName, rawXml, parsed: JSobject, items: [object], sampleFields: Set }
const docs = [];

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

function parseXmlFileSync(filePath) {
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
  // Attempt to find the main array of elements (root -> child array/list)
  // Heuristics: if root has multiple child keys, find the first child that's array-like or object with multiple children
  const rootKeys = Object.keys(parsed);
  if (rootKeys.length === 0) return [];
  const root = parsed[rootKeys[0]];
  // If root itself is array or object
  // If root contains many same-named properties, convert to array
  // Try to find the main list: a property whose value is array OR object with multiple items
  for (const key of Object.keys(root)) {
    const val = root[key];
    if (Array.isArray(val))
      return { rootName: rootKeys[0], itemsName: key, items: val };
    if (typeof val === "object") {
      // If object has numeric-like keys or many nested objects, try to see if it's item wrapper
      if (
        Object.keys(val).length > 0 &&
        Object.values(val).every(
          (v) => typeof v === "object" || typeof v === "string"
        )
      ) {
        // If it's a single item (object), treat it as single-element array
        return {
          rootName: rootKeys[0],
          itemsName: key,
          items: Array.isArray(val) ? val : [val],
        };
      }
    }
  }
  // fallback: if root itself looks like items (array)
  if (Array.isArray(root))
    return { rootName: rootKeys[0], itemsName: rootKeys[0], items: root };
  // Else, try to treat each child of root as an item if they are objects
  const candidateItems = [];
  for (const key of Object.keys(root)) {
    const val = root[key];
    if (typeof val === "object") {
      candidateItems.push(val);
    }
  }
  if (candidateItems.length > 0)
    return { rootName: rootKeys[0], itemsName: "items", items: candidateItems };
  return { rootName: rootKeys[0], itemsName: "items", items: [] };
}

function inferFields(items) {
  const fields = new Set();
  items.forEach((it) => {
    if (typeof it === "object") {
      Object.keys(it).forEach((k) => fields.add(k));
    }
  });
  return Array.from(fields);
}

app.post("/api/upload", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    // clear docs
    // NOTE: we keep per-upload session docs; for simplicity, clear previous
    docs.length = 0;

    for (const f of files) {
      const { xml, result } = await parseXmlFileSync(f.path);
      const { rootName, itemsName, items } = extractItems(result);
      const itemsArr = items || [];
      const fields = inferFields(itemsArr);
      const id = path.basename(f.filename);
      docs.push({
        id,
        filename: f.originalname,
        rootName,
        itemsName,
        rawXml: xml,
        parsed: result,
        items: itemsArr,
        fields,
      });
      // cleanup uploaded file
      fs.unlinkSync(f.path);
    }
    return res.json({
      ok: true,
      docs: docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        rootName: d.rootName,
        itemsName: d.itemsName,
        count: d.items.length,
        fields: d.fields,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/api/documents", (req, res) => {
  return res.json(
    docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      rootName: d.rootName,
      itemsName: d.itemsName,
      count: d.items.length,
      fields: d.fields,
    }))
  );
});

/**
 * POST /api/join
 * body: {
 *   primaryDocId: docId,
 *   primaryIdField: 'id' (field name in primary doc),
 *   joins: [
 *     { docId: otherDocId, foreignKeyField: 'artikelId', as: 'artikel' }
 *   ]
 * }
 */
app.post("/api/join", (req, res) => {
  try {
    const { primaryDocId, primaryIdField, joins } = req.body;
    const primaryDoc = docs.find((d) => d.id === primaryDocId);
    if (!primaryDoc)
      return res.status(400).json({ error: "Primary doc not found" });
    const primaryItems = primaryDoc.items.map((it, idx) => ({
      ...it,
      __sourceIndex: idx,
    }));

    // build index for primary by primaryIdField
    // Note: field might be attribute or child. We used xml2js with mergeAttrs:true so attributes merged.
    // Take values as strings.
    const primaryIndex = new Map();
    primaryItems.forEach((it) => {
      const key =
        it && it[primaryIdField] != null ? String(it[primaryIdField]) : null;
      primaryIndex.set(key, it);
    });

    // We'll produce joined results by iterating primary items and attaching matched objects from other docs based on mapping
    const results = primaryItems.map((item) => {
      const out = { ...item };
      if (joins && Array.isArray(joins)) {
        for (const j of joins) {
          const otherDoc = docs.find((d) => d.id === j.docId);
          const rawAlias =
            j.as ||
            (otherDoc ? otherDoc.filename.replace(/\.xml$/, "") : j.docId);
          const alias = safeKey(rawAlias);
          if (!otherDoc) {
            out[alias] = null;
            continue;
          }
          // We expect foreign key stored in primary item or in otherDoc - support both directions:
          const fk = item[j.foreignKeyField];
          let found = null;
          if (fk != null) {
            // find otherDoc item with otherField == fk
            found = otherDoc.items.find((o) => {
              const otherVal = o[j.matchField];
              return otherVal != null && String(otherVal) === String(fk);
            });
          } else {
            // attempt reverse: otherDoc has fk pointing to primary
            found = otherDoc.items.find((o) => {
              const val = o[j.foreignKeyField];
              return (
                val != null && String(val) === String(item[primaryIdField])
              );
            });
          }

          out[alias] = found || null;
          if (found) {
            // add stable flattened fields
            out[`${alias}_id`] = found.id || null;
            const name = found.naziv || found.name || null;
            if (name) out[`${alias}_name`] = name;
          }
        }
      }
      return out;
    });

    // store last results in memory for export
    app.locals.lastResults = results;
    app.locals.lastPrimary = { docId: primaryDocId, primaryIdField, joins };

    return res.json({
      ok: true,
      count: results.length,
      sample: results.slice(0, 20),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/api/filter", (req, res) => {
  // body: { filters: [ { field, op, value } ] }
  try {
    const { filters } = req.body;
    let arr = app.locals.lastResults || [];
    if (!Array.isArray(arr)) arr = [];
    if (!filters || filters.length === 0)
      return res.json({ ok: true, count: arr.length, data: arr });
    const filtered = arr.filter((item) => {
      return filters.every((f) => {
        const left = item[f.field];
        const right = f.value;
        if (left == null) return false;
        // numeric compare if both numeric
        const leftNum = Number(left);
        const rightNum = Number(right);
        if (!isNaN(leftNum) && !isNaN(rightNum)) {
          if (f.op === "<") return leftNum < rightNum;
          if (f.op === ">") return leftNum > rightNum;
          if (f.op === "=") return leftNum === rightNum;
        }
        // string ops
        const leftStr = String(left).toLowerCase();
        const rightStr = String(right).toLowerCase();
        if (f.op === "contains") return leftStr.includes(rightStr);
        if (f.op === "=") return leftStr === rightStr;
        return false;
      });
    });
    app.locals.lastFiltered = filtered;
    return res.json({ ok: true, count: filtered.length, data: filtered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/api/export/json", (req, res) => {
  const data = app.locals.lastFiltered || app.locals.lastResults || [];
  const outPath = path.join(__dirname, "output");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath);
  const filePath = path.join(outPath, "filtrirano.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  res.download(filePath); // triggers save
});

app.get("/api/export/xml", (req, res) => {
  const data = app.locals.lastFiltered || app.locals.lastResults || [];
  // build XML with root <filteredResults><item>...</item></filteredResults>
  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele(
    safeTagName("filteredResults")
  );

  const appendValue = (parent, key, value, depth = 0) => {
    const tag = safeTagName(key);
    // Skip top-level id because we set it as attribute; but include nested ids
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
    // set id attribute if present
    const itemId = item.id || item.ID || idx + 1;
    it.att("id", String(itemId));

    Object.keys(item).forEach((k) => {
      if (k === "id" || k === "ID") return; // already used as attribute
      appendValue(it, k, item[k]);
    });
    it.up();
  });

  const xml = doc.end({ prettyPrint: true });
  const outPath = path.join(__dirname, "output");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath);
  const filePath = path.join(outPath, "filtrirano.xml");
  fs.writeFileSync(filePath, xml, "utf8");
  res.download(filePath);
});

// convenience: clear stored data
app.post("/api/clear", (req, res) => {
  docs.length = 0;
  app.locals.lastResults = null;
  app.locals.lastFiltered = null;
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Backend listening on http://localhost:${PORT}`)
);
