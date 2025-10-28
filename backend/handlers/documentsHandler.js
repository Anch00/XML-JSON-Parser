const datastore = require("../lib/datastore");

function handleDocuments(req, res) {
  return res.json(datastore.listSummary());
}

module.exports = { handleDocuments };
