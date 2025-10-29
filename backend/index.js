// Minimal modular backend entrypoint
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// handlers
const { handleUpload } = require("./handlers/uploadHandler");
const { handleDocuments } = require("./handlers/documentsHandler");
const { handleJoin } = require("./handlers/joinHandler");
const { handleFilter } = require("./handlers/filterHandler");
const {
  exportJSON,
  exportXML,
  clearHandler,
} = require("./handlers/exportHandler");
const { handleScrape, handleCities } = require("./handlers/scrapeHandler");

app.post("/api/upload", upload.array("files", 10), handleUpload);
app.get("/api/documents", handleDocuments);
app.post("/api/join", handleJoin);
app.post("/api/filter", handleFilter);
app.post("/api/export/json", exportJSON);
app.post("/api/export/xml", exportXML);
app.post("/api/clear", clearHandler);
app.get("/api/scrape-attractions", handleScrape);
app.get("/api/attractions-cities", handleCities);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Backend listening on http://localhost:${PORT}`)
);
