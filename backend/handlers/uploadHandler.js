const path = require("path");
const fs = require("fs");
const xml2js = require("xml2js");
const {
  parseXmlFileSync,
  extractItems,
  inferFields,
} = require("../lib/xmlUtils");
const datastore = require("../lib/datastore");

async function handleUpload(req, res) {
  try {
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    datastore.clear();

    for (const f of files) {
      const { xml, result } = await parseXmlFileSync(f.path, xml2js);
      const { rootName, itemsName, items } = extractItems(result);
      const itemsArr = items || [];
      const fields = inferFields(itemsArr);
      const id = path.basename(f.filename);
      datastore.docs.push({
        id,
        filename: f.originalname,
        rootName,
        itemsName,
        rawXml: xml,
        parsed: result,
        items: itemsArr,
        fields,
      });
      fs.unlinkSync(f.path);
    }

    return res.json({ ok: true, docs: datastore.listSummary() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}

module.exports = { handleUpload };
