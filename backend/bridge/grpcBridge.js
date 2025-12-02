const express = require("express");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const router = express.Router();
const PROTO_PATH = path.join(__dirname, "../proto/xml_service.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const xmlservice = protoDescriptor.xmlservice;

const client = new xmlservice.XmlService(
  process.env.GRPC_ADDR || "localhost:50051",
  grpc.credentials.createInsecure()
);

router.get("/documents", (req, res) => {
  client.ListDocuments({}, (err, response) => {
    if (err) return res.status(500).json({ error: String(err.message || err) });
    res.json(response);
  });
});

router.post("/join", (req, res) => {
  const payload = req.body || {};
  client.JoinData(payload, (err, response) => {
    if (err) return res.status(500).json({ error: String(err.message || err) });
    const items = (response.items || []).map((x) => {
      try {
        return JSON.parse(x.json || "{}");
      } catch (e) {
        return {};
      }
    });
    res.json({ items });
  });
});

router.post("/filter", (req, res) => {
  const input = req.body || {};
  const payload = {
    ...input,
    items: Array.isArray(input.items)
      ? input.items.map((it) => ({ json: JSON.stringify(it) }))
      : [],
  };
  client.FilterData(payload, (err, response) => {
    if (err) return res.status(500).json({ error: String(err.message || err) });
    const items = (response.items || []).map((x) => {
      try {
        return JSON.parse(x.json || "{}");
      } catch {
        return {};
      }
    });
    res.json({ items });
  });
});

router.post("/export", (req, res) => {
  const input = req.body || {};
  const payload = {
    ...input,
    items: Array.isArray(input.items)
      ? input.items.map((it) => ({ json: JSON.stringify(it) }))
      : [],
  };
  client.ExportData(payload, (err, response) => {
    if (err) return res.status(500).json({ error: String(err.message || err) });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${response.filename || "export.bin"}`
    );
    res.send(Buffer.from(response.content));
  });
});

// SSE streaming bridge for attractions
router.get("/attractions-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders && res.flushHeaders();
  // initial ping so client shows connection is open
  res.write(": connected\n\n");
  const citySlug = req.query.citySlug || "berlin-germany";
  const call = client.StreamAttractions({ citySlug });
  call.on("data", (a) => {
    res.write(`data: ${JSON.stringify(a)}\n\n`);
  });
  call.on("end", () => {
    res.write("event: end\n");
    res.write("data: end\n\n");
    res.end();
  });
  call.on("error", (err) => {
    res.write(`event: error\n`);
    res.write(
      `data: ${JSON.stringify({ error: String(err.message || err) })}\n\n`
    );
    res.end();
  });
});

module.exports = router;
