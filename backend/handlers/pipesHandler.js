const { requestViaPipe, PIPE_PATH } = require("../pipes/pipeClient");

async function health(req, res) {
  try {
    const out = await requestViaPipe({ action: "ping" }, { timeoutMs: 1500 });
    res.json({ available: true, response: out });
  } catch (e) {
    res
      .status(200)
      .json({ available: false, error: String((e && e.message) || e) });
  }
}

async function attractions(req, res) {
  const citySlug = String(req.body?.citySlug || "london-england");
  const limit = Number(req.body?.limit || 10);
  try {
    console.log("[PipesHandler] Forwarding getAttractions via pipe", {
      citySlug,
      limit,
      PIPE_PATH,
    });
    const out = await requestViaPipe(
      { action: "getAttractions", citySlug, limit },
      { timeoutMs: 5000 }
    );
    console.log("[PipesHandler] Pipe response", {
      ok: out?.ok,
      count: out?.count,
      source: out?.source,
    });
    res.json(out);
  } catch (e) {
    console.error("[PipesHandler] Pipe error", e?.message || e);
    res.status(503).json({ ok: false, error: String((e && e.message) || e) });
  }
}

module.exports = { health, attractions };
