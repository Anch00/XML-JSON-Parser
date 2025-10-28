const datastore = require("../lib/datastore");
const { safeKey } = require("../lib/xmlUtils");

function handleJoin(req, res) {
  try {
    const { primaryDocId, primaryIdField, joins } = req.body;
    const primaryDoc = datastore.docs.find((d) => d.id === primaryDocId);
    if (!primaryDoc)
      return res.status(400).json({ error: "Primary doc not found" });

    const primaryItems = primaryDoc.items.map((it, idx) => ({
      ...it,
      __sourceIndex: idx,
    }));

    const results = primaryItems.map((item) => {
      const out = { ...item };
      if (joins && Array.isArray(joins)) {
        for (const j of joins) {
          const otherDoc = datastore.docs.find((d) => d.id === j.docId);
          const rawAlias =
            j.as ||
            (otherDoc ? otherDoc.filename.replace(/\.xml$/, "") : j.docId);
          const alias = safeKey(rawAlias);
          if (!otherDoc) {
            out[alias] = null;
            continue;
          }
          const fk = item[j.foreignKeyField];
          let found = null;
          if (fk != null) {
            found = otherDoc.items.find((o) => {
              const otherVal = o[j.matchField];
              return otherVal != null && String(otherVal) === String(fk);
            });
          } else {
            found = otherDoc.items.find((o) => {
              const val = o[j.foreignKeyField];
              return (
                val != null && String(val) === String(item[primaryIdField])
              );
            });
          }

          out[alias] = found || null;
          if (found) {
            out[`${alias}_id`] = found.id || null;
          }
        }
      }
      return out;
    });

    // store last results in memory for export
    // Note: in original project app.locals was used; handlers are stateless so return results
    return res.json({
      ok: true,
      count: results.length,
      sample: results.slice(0, 20),
      results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}

module.exports = { handleJoin };
