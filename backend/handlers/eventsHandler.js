const rabbitmq = require("../lib/rabbitmq");
const store = require("../lib/attractionsStore");

async function health(req, res) {
  const s = await rabbitmq.checkConnection();
  res.status(s.available ? 200 : 503).json(s);
}

async function publishEvent(req, res) {
  const { type, data } = req.body || {};
  if (!type) return res.status(400).json({ success: false, error: "Event type is required" });
  try {
    const out = await rabbitmq.publishEvent({ type, data });
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(503).json({ success: false, error: e?.message || String(e) });
  }
}

async function stats(req, res) {
  try {
    const st = await rabbitmq.getQueueStats();
    res.json(st);
  } catch (e) {
    res.status(503).json({ error: e?.message || String(e) });
  }
}

function subscribe(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  // Send initial snapshot of attractions state
  try { res.write(`data: ${JSON.stringify({ type: "snapshot", state: store.getAll() })}\n\n`); } catch {}

  const listener = (payload) => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
  };
  rabbitmq.addListener(listener);

  req.on("close", () => {
    rabbitmq.removeListener(listener);
    try { res.end(); } catch {}
  });
}
function listAttractions(req, res) {
  try { res.json({ items: store.getAll() }); }
  catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
}

module.exports = { health, publishEvent, stats, subscribe, listAttractions };
