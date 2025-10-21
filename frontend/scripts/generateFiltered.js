const fs = require("fs");
const { XMLParser, XMLBuilder } = require("fast-xml-parser");
const path = require("path");

// data directory relative to this script (frontend/scripts -> ../../data)
const dataDir = path.join(__dirname, "..", "..", "data");
const outFile = path.join(dataDir, "filtrirano.generated.xml");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function readXml(name) {
  const xml = fs.readFileSync(path.join(dataDir, name), "utf8");
  return parser.parse(xml);
}

function buildFiltered(artikliRoot, dobaviteljiRoot) {
  const artikli = artikliRoot.artikli.artikel || [];
  const dobavitelji = dobaviteljiRoot.dobavitelji.dobavitelj || [];

  const dobMap = new Map();
  dobavitelji.forEach((d) => dobMap.set(d.id, d));

  const items = artikli.map((a) => {
    const id = a["@_id"] || a.id || "";
    const dob = dobMap.get(a.dobaviteljId) || null;

    return {
      id,
      naziv: a.naziv,
      cena: a.cena,
      zaloga: a.zaloga,
      dobaviteljId: a.dobaviteljId,
      dobavitelj: dob
        ? { id: dob["@_id"] || dob.id || "", naziv: dob.naziv }
        : undefined,
      kategorija: a.kategorija,
      datumDodajanja: a.datumDodajanja,
      opis: a.opis,
      aktivn: a.aktivn,
      datumZadnjeNabave: a.datumZadnjeNabave,
    };
  });

  return { filteredResults: { item: items } };
}

function toXml(obj) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
  });
  return builder.build(obj);
}

function main() {
  console.log("Reading source files...");
  const artikli = readXml("../../data/artikli.xml");
  const dobavitelji = readXml("../../data/dobavitelji.xml");

  console.log("Building filtered structure...");
  const filtered = buildFiltered(artikli, dobavitelji);

  console.log("Serializing to XML...");
  const xml = toXml(filtered);
  fs.writeFileSync(outFile, xml, "utf8");
  console.log("Written:", outFile);
}

main();
