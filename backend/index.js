// Minimal modular backend entrypoint
require("dotenv").config();
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
const { getPXMeta, getPXSeries } = require("./handlers/pxHandler");
const { handleLLMTripPlan } = require("./handlers/llmPlanHandler");
const pipesHandler = require("./handlers/pipesHandler");
const eventsHandler = require("./handlers/eventsHandler");
const grpcServer = require("./grpc/server");
const grpcBridge = require("./bridge/grpcBridge");

app.post("/api/upload", upload.array("files", 10), handleUpload);
app.get("/api/documents", handleDocuments);
app.post("/api/join", handleJoin);
app.post("/api/filter", handleFilter);
app.post("/api/export/json", exportJSON);
app.post("/api/export/xml", exportXML);
app.post("/api/clear", clearHandler);
app.get("/api/scrape-attractions", handleScrape);
app.get("/api/attractions-cities", handleCities);

// PC-Axis endpoints
app.get("/api/px/meta", getPXMeta);
app.get("/api/px/series", getPXSeries);

// LLM Trip Planner
app.post("/api/llm/trip-plan", handleLLMTripPlan);

// gRPC bridge routes
app.use("/grpc", grpcBridge);

// Named Pipes demo routes
app.get("/api/pipes/health", pipesHandler.health);
app.post("/api/pipes/attractions", pipesHandler.attractions);

// RabbitMQ Event-driven routes
app.get("/api/events/health", eventsHandler.health);
app.post("/api/events/publish", eventsHandler.publishEvent);
app.get("/api/events/stats", eventsHandler.stats);
app.get("/api/events/subscribe", eventsHandler.subscribe);
app.get("/api/events/attractions", eventsHandler.listAttractions);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  // Start gRPC server alongside Express
  try {
    grpcServer.start();
  } catch (e) {
    console.error("Failed to start gRPC server:", e);
  }

  // Start RabbitMQ consumer with auto-retry until broker is up
  const rabbitmq = require("./lib/rabbitmq");
  let consumerStarted = false;
  const tryStart = async () => {
    if (consumerStarted) return;
    try {
      await rabbitmq.startConsumer();
      console.log("[RabbitMQ] Consumer started successfully");
      consumerStarted = true;
    } catch (err) {
      console.warn("[RabbitMQ] Consumer failed to start:", err?.message || err);
    }
  };
  tryStart();
  const t = setInterval(async () => {
    if (consumerStarted) return clearInterval(t);
    await tryStart();
  }, 5000);
});
