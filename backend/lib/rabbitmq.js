const amqp = require("amqplib");
const store = require("./attractionsStore");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const QUEUE_NAME = "attraction-events";

let connection = null;
let channel = null;
let isConnecting = false;
const listeners = new Set();

async function connect() {
  if (connection && channel) return { connection, channel };
  if (isConnecting) {
    await new Promise((r) => setTimeout(r, 100));
    return connect();
  }
  isConnecting = true;
  try {
    console.log("[RabbitMQ] Connecting to:", RABBITMQ_URL);
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    connection.on("error", () => { connection = null; channel = null; });
    connection.on("close", () => { connection = null; channel = null; });
    isConnecting = false;
    return { connection, channel };
  } catch (e) {
    isConnecting = false;
    connection = null;
    channel = null;
    console.error("[RabbitMQ] Failed to connect:", e?.message || "");
    throw e;
  }
}

async function checkConnection() {
  try {
    await connect();
    const chk = await channel.checkQueue(QUEUE_NAME);
    return { available: true, queue: QUEUE_NAME, messageCount: chk.messageCount, consumerCount: chk.consumerCount };
  } catch (e) {
    return { available: false, error: e?.message || String(e) };
  }
}

async function publishEvent(event) {
  const { channel } = await connect();
  const payload = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const ok = channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
  if (!ok) throw new Error("Queue buffer full");
  return { success: true, eventId: payload.id };
}

async function startConsumer() {
  const { channel } = await connect();
  await channel.prefetch(1);
  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;
    try {
      const evt = JSON.parse(msg.content.toString());
      const result = await processEvent(evt);
      notify({ event: evt, result, state: store.getAll(), processedAt: new Date().toISOString() });
      channel.ack(msg);
    } catch (e) {
      console.error("[RabbitMQ] Processing error:", e?.message || e);
      channel.nack(msg, false, true);
    }
  }, { noAck: false });
  return { success: true };
}

async function processEvent(evt) {
  const d = evt.data || {};
  switch (evt.type) {
    case "attraction-added": {
      const r = store.add({ name: d.name, description: d.description });
      return r.success
        ? { status: "processed", action: "added", message: `Dodana: ${r.item.name}` }
        : { status: "error", action: "added", message: r.error || "Napaka pri dodajanju" };
    }
    case "attraction-updated": {
      const r = store.update({ originalName: d.originalName, name: d.name, description: d.description });
      return r.success
        ? { status: "processed", action: "updated", message: `Posodobljena: ${r.item.name}` }
        : { status: "error", action: "updated", message: r.error || "Napaka pri posodabljanju" };
    }
    case "attraction-deleted": {
      const r = store.remove({ name: d.name });
      return r.success
        ? { status: "processed", action: "deleted", message: `Izbrisana: ${r.item.name}` }
        : { status: "error", action: "deleted", message: r.error || "Napaka pri brisanju" };
    }
    case "attraction-visited": {
      const r = store.visited({ name: d.name });
      return r.success
        ? { status: "processed", action: "visited", message: `Obisk: ${r.item.name} (${r.item.visits})` }
        : { status: "error", action: "visited", message: r.error || "Napaka pri obisku" };
    }
    default:
      return { status: "processed", action: "unknown", message: `Dogodek: ${evt.type}` };
  }
}

function addListener(fn) { listeners.add(fn); }
function removeListener(fn) { listeners.delete(fn); }
function notify(data) {
  listeners.forEach((fn) => { try { fn(data); } catch {} });
}

async function getQueueStats() {
  const { channel } = await connect();
  const q = await channel.checkQueue(QUEUE_NAME);
  return { queue: QUEUE_NAME, messageCount: q.messageCount, consumerCount: q.consumerCount };
}

module.exports = { connect, checkConnection, publishEvent, startConsumer, addListener, removeListener, getQueueStats };
