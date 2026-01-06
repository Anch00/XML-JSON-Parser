// Named Pipes server (Windows) using Node's net module
// Exposes a simple domain-specific API for attractions lookups

const net = require("net");
const fs = require("fs");
const path = require("path");

const PIPE_NAME = process.env.NAMED_PIPE_NAME || "xml_parser_pipe";
const PIPE_PATH =
  process.platform === "win32"
    ? `\\\\.\\pipe\\${PIPE_NAME}`
    : path.join(process.cwd(), ".tmp", `${PIPE_NAME}.sock`); // unix fallback

function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function summarize(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function readAttractions(citySlug) {
  // Tries city-specific file first: data/attractions.<citySlug>.json
  // Fallbacks to data/attractions.json then static demo
  const dataDir = path.join(process.cwd(), "..", "data");
  const cityFile = path.join(dataDir, `attractions.${citySlug}.json`);
  const defaultFile = path.join(dataDir, "attractions.json");

  const tryLoad = (p) => {
    if (!fs.existsSync(p)) return null;
    try {
      const content = fs.readFileSync(p, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  };

  const city = tryLoad(cityFile);
  if (city && Array.isArray(city.attractions))
    return { ...city, source: "city", sourceFile: cityFile };

  const def = tryLoad(defaultFile);
  if (def && Array.isArray(def.attractions))
    return { ...def, source: "default", sourceFile: defaultFile };

  return {
    citySlug: citySlug || "unknown-city",
    updatedAt: new Date().toISOString(),
    attractions: [
      {
        name: "Demo Museum",
        description: "A placeholder museum for demo purposes.",
        url: "https://example.org/museum",
      },
      {
        name: "Demo Park",
        description: "A placeholder park for demo purposes.",
        url: "https://example.org/park",
      },
      {
        name: "Demo Tower",
        description: "A placeholder tower for demo purposes.",
        url: "https://example.org/tower",
      },
    ],
    source: "demo",
    sourceFile: null,
  };
}

function handleMessage(msg, socket) {
  const action = msg && msg.action;
  if (action === "ping") {
    const res = {
      ok: true,
      server: "named-pipe",
      time: new Date().toISOString(),
    };
    socket.write(JSON.stringify(res) + "\n");
    console.log("[NamedPipeServer] Sent ping response:", summarize(res));
    return;
  }

  if (action === "getAttractions") {
    const citySlug = (msg && msg.citySlug) || "london-england";
    const limit = Math.max(1, Math.min(50, Number(msg && msg.limit) || 10));
    const data = readAttractions(citySlug);
    const items = (data.attractions || []).slice(0, limit);
    const res = {
      ok: true,
      citySlug: data.citySlug || citySlug,
      count: items.length,
      items,
      sourceUpdatedAt: data.updatedAt || null,
      source: data.source || null,
      sourceFile: data.sourceFile || null,
    };
    socket.write(JSON.stringify(res) + "\n");
    console.log(
      "[NamedPipeServer] Sent attractions:",
      `count=${res.count} source=${res.source} citySlug=${res.citySlug}`
    );
    return;
  }

  // Unknown action
  socket.write(
    JSON.stringify({ ok: false, error: `Unknown action: ${action}` }) + "\n"
  );
}

function startServer() {
  // Ensure unix directory exists if not on Windows
  if (process.platform !== "win32") {
    const dir = path.dirname(PIPE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(PIPE_PATH)) fs.rmSync(PIPE_PATH);
  }

  const server = net.createServer((socket) => {
    console.log("[NamedPipeServer] Client connected");
    let buffer = "";
    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      buffer += chunk;
      let idx;
      // Process NDJSON messages
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        console.log("[NamedPipeServer] Received:", line);
        const msg = safeParseJSON(line);
        if (!msg) {
          socket.write(
            JSON.stringify({ ok: false, error: "Invalid JSON" }) + "\n"
          );
          console.log("[NamedPipeServer] Sent: invalid JSON error");
          continue;
        }
        try {
          handleMessage(msg, socket);
        } catch (e) {
          socket.write(
            JSON.stringify({
              ok: false,
              error: String((e && e.message) || e),
            }) + "\n"
          );
          console.log(
            "[NamedPipeServer] Sent error:",
            String((e && e.message) || e)
          );
        }
      }
    });

    socket.on("error", () => {});
    socket.on("end", () => {
      console.log("[NamedPipeServer] Client ended connection");
    });
    socket.on("close", () => {
      console.log("[NamedPipeServer] Client connection closed");
    });
  });

  server.on("error", (err) => {
    console.error("[NamedPipeServer] Error:", err);
    process.exitCode = 1;
  });

  server.listen(PIPE_PATH, () => {
    console.log(`[NamedPipeServer] Listening on ${PIPE_PATH}`);
  });
}

startServer();
