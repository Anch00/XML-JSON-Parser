const docs = [];

function clear() {
  docs.length = 0;
}

function listSummary() {
  return docs.map((d) => ({
    id: d.id,
    filename: d.filename,
    rootName: d.rootName,
    itemsName: d.itemsName,
    count: d.items.length,
    fields: d.fields,
  }));
}

module.exports = { docs, clear, listSummary };
