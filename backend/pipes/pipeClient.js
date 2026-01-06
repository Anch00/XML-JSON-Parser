const net = require("net");

const PIPE_NAME = process.env.NAMED_PIPE_NAME || "xml_parser_pipe";
const PIPE_PATH =
  process.platform === "win32"
    ? `\\\\.\\pipe\\${PIPE_NAME}`
    : require("path").join(process.cwd(), ".tmp", `${PIPE_NAME}.sock`);

function requestViaPipe(payload, { timeoutMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let timer = null;
    let buffer = "";

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
    };

    timer = setTimeout(() => {
      console.error("[NamedPipeClient] Timeout waiting for response");
      cleanup();
      reject(new Error("Named pipe request timed out"));
    }, timeoutMs);

    socket.setEncoding("utf8");

    socket.on("error", (err) => {
      console.error("[NamedPipeClient] Error:", err?.message || err);
      cleanup();
      reject(err);
    });

    socket.on("data", (chunk) => {
      buffer += chunk;
      const idx = buffer.indexOf("\n");
      if (idx !== -1) {
        const line = buffer.slice(0, idx);
        cleanup();
        try {
          const json = JSON.parse(line);
          console.log("[NamedPipeClient] Received:", {
            ok: json?.ok,
            count: json?.count,
            source: json?.source,
            citySlug: json?.citySlug,
          });
          resolve(json);
        } catch (e) {
          reject(new Error("Invalid JSON response from pipe"));
        }
      }
    });

    socket.connect(PIPE_PATH, () => {
      console.log("[NamedPipeClient] Connected:", PIPE_PATH);
      try {
        const msg = JSON.stringify(payload) + "\n";
        console.log("[NamedPipeClient] Sending:", payload);
        socket.write(msg);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  });
}

module.exports = { requestViaPipe, PIPE_PATH };
