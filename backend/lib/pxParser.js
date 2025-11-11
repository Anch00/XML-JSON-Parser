const fs = require("fs");
// use iconv-lite to decode files saved in codepages like windows-1250
let iconv;
try {
  iconv = require("iconv-lite");
} catch (e) {
  // iconv-lite not installed; we'll fall back to utf8 read which may mangle special chars
  iconv = null;
}

// Minimal PC-Axis (.px) parser tailored for the provided file structure.
// Parses metadata fields like STUB, HEADING, VALUES(...) and the DATA block.

function unquote(s) {
  if (!s) return s;
  return s.replace(/^"|"$/g, "").trim();
}

function splitValuesList(s) {
  // s like "A","B","C" possibly with newlines and commas
  const parts = [];
  let acc = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      inQuote = !inQuote;
      acc += ch;
    } else if (ch === "," && !inQuote) {
      if (acc.trim()) parts.push(unquote(acc.trim()));
      acc = "";
    } else {
      acc += ch;
    }
  }
  if (acc.trim()) parts.push(unquote(acc.trim()));
  return parts;
}

function parseKeyValueLines(text) {
  const lines = text.split(/\r?\n/);
  const meta = {};
  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    // accumulate until semicolon
    while (line.indexOf(";") === -1 && i + 1 < lines.length) {
      i++;
      line += "\n" + lines[i].trim();
    }
    const semi = line.lastIndexOf(";");
    const stmt = semi !== -1 ? line.substring(0, semi) : line;
    // find name and value
    const eq = stmt.indexOf("=");
    if (eq !== -1) {
      const name = stmt.substring(0, eq).trim();
      const value = stmt.substring(eq + 1).trim();
      meta[name] = value;
    }
    i++;
  }
  return meta;
}

function extractValues(meta) {
  // STUB, HEADING, VALUES("..."), VALUES[en]("...") etc.
  const result = {
    stub: [], // order of stub variables
    heading: [],
    values: {}, // key -> array of values
    values_en: {},
  };

  if (meta["STUB"]) {
    // STUB = "LETO","TURIST...","NASTANITVENI";
    result.stub = splitValuesList(meta["STUB"]);
  }
  if (meta["HEADING"]) {
    result.heading = splitValuesList(meta["HEADING"]);
  }

  for (const k of Object.keys(meta)) {
    const m = k.match(/^VALUES(\[en\])?\("(.+)"\)$/);
    if (m) {
      const en = !!m[1];
      const key = m[2];
      const arr = splitValuesList(meta[k]);
      if (en) result.values_en[key] = arr;
      else result.values[key] = arr;
    }
  }
  return result;
}

function parseDataArray(dataText) {
  // Data block ends with a semicolon in file. Remove quotes around '....'
  // We'll split by whitespace, but "...." tokens appear with quotes or not.
  const cleaned = dataText.replace(/\n/g, " ").trim();
  // remove trailing semicolon
  const lastSemi = cleaned.lastIndexOf(";");
  const body = lastSemi !== -1 ? cleaned.substring(0, lastSemi) : cleaned;
  // tokens may be quoted or unquoted separated by spaces
  const tokens = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') {
      inQuote = !inQuote;
      cur += ch;
    } else if (ch === " " && !inQuote) {
      if (cur !== "") {
        tokens.push(cur.trim());
        cur = "";
      }
    } else {
      cur += ch;
    }
  }
  if (cur !== "") tokens.push(cur.trim());

  // normalize tokens: remove surrounding quotes and convert to number|null
  return tokens.map((t) => {
    const u = unquote(t);
    if (u === "....") return null;
    if (u === ".") return null;
    const n = Number(u.replace(/,/g, ""));
    if (isNaN(n)) return null;
    return n;
  });
}

function parsePX(text) {
  // split into header/meta and DATA= ... ;
  const dataMatch = text.match(/DATA\s*=\s*([\s\S]+)$/m);
  let metaText = text;
  let dataText = "";
  if (dataMatch) {
    const idx = text.indexOf("DATA=");
    metaText = text.substring(0, idx);
    dataText = text.substring(idx + "DATA=".length);
  }
  const meta = parseKeyValueLines(metaText);
  const extracted = extractValues(meta);
  const dataTokens = parseDataArray(dataText);

  // determine stub combination counts (rows) and heading counts (columns)
  const stubNames = extracted.stub; // e.g., ["LETO","TURIST...","NASTANITVENI OBRAT"]
  const headingNames = extracted.heading; // e.g., ['MERITVE']
  // For each heading variable there is a VALUES(...) entry - assume only one heading variable here.

  // Build an ordered map of stub -> values
  const stubValues = {};
  for (const s of stubNames) {
    stubValues[s] = extracted.values[s] || [];
  }
  // headingValues: single dimension for MERITVE
  const headingDimName = headingNames[0];
  const headingValues = extracted.values[headingDimName] || [];

  // compute counts
  const rowsCount = Object.values(stubValues).reduce((p, a) => p * a.length, 1);
  const colsCount = headingValues.length;

  // Build 2D data: rowsCount x colsCount
  const data = [];
  let idxTok = 0;
  for (let r = 0; r < rowsCount; r++) {
    const row = [];
    for (let c = 0; c < colsCount; c++) {
      row.push(dataTokens[idxTok++] ?? null);
    }
    data.push(row);
  }

  return {
    meta,
    stubNames,
    headingNames,
    stubValues,
    // also expose raw parsed VALUES maps (local language and en)
    values: extracted.values,
    values_en: extracted.values_en,
    headingValues,
    data,
    rowsCount,
    colsCount,
  };
}

function loadPXFileSync(path) {
  // read raw buffer then decode using windows-1250 if available (the .px file often uses that codepage)
  const buf = fs.readFileSync(path);

  // try to detect CODEPAGE from the header by reading the first few KB as ASCII
  let detectedCodepage = null;
  try {
    const head = buf.toString("ascii", 0, Math.min(buf.length, 4096));
    const m = head.match(/CODEPAGE\s*=\s*"([^"]+)"/i);
    if (m) detectedCodepage = m[1];
  } catch (e) {
    detectedCodepage = null;
  }

  // choose encoding: prefer detected codepage, else windows-1250, else utf8
  const encodingToUse = (detectedCodepage || "windows-1250").toLowerCase();

  let text;
  if (iconv && iconv.decode) {
    try {
      text = iconv.decode(buf, encodingToUse);
    } catch (e) {
      // fallback to windows-1250 then utf8
      try {
        text = iconv.decode(buf, "windows-1250");
      } catch (e2) {
        text = buf.toString("utf8");
      }
    }
  } else {
    text = buf.toString("utf8");
  }

  return parsePX(text);
}

module.exports = { parsePX, loadPXFileSync };
