const fs = require("fs");
const path = require("path");

const DATA_PATH = path.resolve(__dirname, "../../data/attractions-events.json");

let attractions = [];

function ensureFile() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 2), "utf8");
    }
  } catch (e) {
    console.warn("[Store] Failed to ensure file:", e?.message || e);
  }
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    attractions = JSON.parse(raw || "[]");
  } catch (e) {
    console.warn("[Store] Failed to load:", e?.message || e);
    attractions = [];
  }
}

function save() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(attractions, null, 2), "utf8");
  } catch (e) {
    console.error("[Store] Failed to save:", e?.message || e);
  }
}

function getAll() {
  return attractions.slice();
}
function findIndexByName(name) {
  return attractions.findIndex((a) => a.name === name);
}
function findByName(name) {
  return attractions.find((a) => a.name === name) || null;
}

function add({ name, description }) {
  if (!name) return { success: false, error: "Ime je obvezno" };
  if (findIndexByName(name) !== -1)
    return { success: false, error: "Atrakcija že obstaja" };
  const item = {
    name,
    description: description || "",
    visits: 0,
    lastVisited: null,
  };
  attractions.push(item);
  save();
  return { success: true, item };
}

function update({ originalName, name, description }) {
  const key = originalName || name;
  const idx = findIndexByName(key);
  if (idx === -1) return { success: false, error: "Atrakcija ne obstaja" };
  const current = attractions[idx];
  const newName = name || current.name;
  const newDesc =
    typeof description === "string" ? description : current.description;
  attractions[idx] = { ...current, name: newName, description: newDesc };
  save();
  return { success: true, item: attractions[idx] };
}

function remove({ name }) {
  const idx = findIndexByName(name);
  if (idx === -1) return { success: false, error: "Atrakcija ne obstaja" };
  const [deleted] = attractions.splice(idx, 1);
  save();
  return { success: true, item: deleted };
}

function visited({ name }) {
  const idx = findIndexByName(name);
  if (idx === -1) return { success: false, error: "Atrakcija ne obstaja" };
  const current = attractions[idx];
  attractions[idx] = {
    ...current,
    visits: (current.visits || 0) + 1,
    lastVisited: new Date().toISOString(),
  };
  save();
  return { success: true, item: attractions[idx] };
}

load();

module.exports = { getAll, findByName, add, update, remove, visited, load };
