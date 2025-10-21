const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const dataDir = path.join(__dirname, "..", "..", "data");
const file = path.join(dataDir, "filtrirano.generated.xml");

if (!fs.existsSync(file)) {
  console.error("Missing file:", file);
  process.exit(2);
}

const xml = fs.readFileSync(file, "utf8");

// quick check for invalid dynamic tags like <dobavitelj_...>
const dynamicTagRegex = /<\s*dobavitelj_[^>]+>/i;
if (dynamicTagRegex.test(xml)) {
  console.error("FAILED: Found dynamic dobavitelj_ tags in XML");
  process.exit(3);
}

// parse and check nested dobavitelj nodes
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});
let parsed;
try {
  parsed = parser.parse(xml);
} catch (err) {
  console.error("FAILED: XML parse error:", err.message);
  process.exit(4);
}

const items = parsed.filteredResults && parsed.filteredResults.item;
if (!items) {
  console.error("FAILED: No items found in filteredResults");
  process.exit(5);
}

// Ensure at least one item has a nested dobavitelj element
const arr = Array.isArray(items) ? items : [items];
const hasNested = arr.some(
  (it) => it.dobavitelj && (it.dobavitelj.id || it.dobavitelj.naziv)
);
if (!hasNested) {
  console.error("FAILED: No nested <dobavitelj> elements found");
  process.exit(6);
}

console.log("OK: filtrirano.generated.xml looks good.");
process.exit(0);
