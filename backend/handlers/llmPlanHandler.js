const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure API key is provided via environment
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Allow overriding the model via env; provide safe fallbacks
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL, // if provided
  // Gemini 3.x (if supported for your key/region)
  "gemini-3.0-pro",
  "gemini-3.0-flash",
  // Gemini 2.x (recommended if available for your API key/region)
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-pro-exp",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-1.5-pro-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-8b",
  "gemini-1.0-pro",
  "gemini-1.0-pro-vision",
].filter(Boolean);

/**
 * Express handler: Generate trip plan via Gemini.
 * Expects JSON body { city: string, country?: string, startDate: string (YYYY-MM-DD), endDate?: string (YYYY-MM-DD) }
 * Returns structured JSON matching TripPlan schema.
 */
async function handleLLMTripPlan(req, res) {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "Gemini API not configured" });
    }

    const { city, country, startDate, endDate } = req.body || {};
    if (!city || !startDate) {
      return res
        .status(400)
        .json({ error: "Missing required fields: city, startDate" });
    }

    // Try known model IDs until one works for this SDK/API version
    let model;
    let lastErr;
    for (const m of MODEL_CANDIDATES) {
      try {
        model = genAI.getGenerativeModel({ model: m });
        // quick lightweight check: ask for a tiny echo to validate availability
        await model.generateContent({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
        });
        break; // success
      } catch (e) {
        lastErr = e;
        model = undefined;
      }
    }
    if (!model) {
      console.error("Gemini model selection failed.", lastErr);
      return res.status(502).json({
        error: "No supported Gemini model found for this API version",
        hint: "Set GEMINI_MODEL in .env to a supported model (e.g., gemini-1.5-pro or gemini-1.5-flash-001).",
      });
    }

    const now = new Date();
    const currentIso = now.toISOString();

    // System + user prompt: ask for strict JSON conforming to schema
    const prompt = `You are a vacation trip planner.
Plan an optimized daily itinerary for a user visiting ${city}${
      country ? ", " + country : ""
    }.
Trip dates: start ${startDate}${endDate ? ", end " + endDate : " (single day)"}.
Consider typical weather for these dates, opening hours, proximity, and avoid backtracking.
Return ONLY strict JSON that conforms exactly to the following TypeScript schema (no markdown, no extra text):
{
  "destination": string,
  "startDate": string, // ISO yyyy-mm-dd
  "endDate": string,   // ISO yyyy-mm-dd
  "days": Array<{
    "date": string, // ISO yyyy-mm-dd
    "weatherNote": string,
    "summary": string,
    "activities": Array<{
      "time": string, // HH:MM
      "title": string,
      "type": "sightseeing" | "museum" | "food" | "outdoor" | "shopping" | "transport" | "other",
      "address": string,
      "durationMinutes": number,
      "notes"?: string,
      "costEstimate"?: number
    }>
  }>,
  "tips": string[]
}
Rules:
- Base recommendations on ${city} and dates; if exact weather is unknown, infer typical seasonal conditions.
- Prefer walking clusters; group nearby points.
- Include realistic times and durations.
- If endDate is missing, produce a single-day plan for startDate.
- Ensure JSON is valid and parseable.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const rawText = result?.response?.text?.();
    if (!rawText) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    // Some models may wrap JSON in code fences; try to extract JSON safely
    const jsonStr = rawText
      .replace(/^```json\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return res
        .status(502)
        .json({ error: "Failed to parse JSON from model", raw: rawText });
    }

    // Attach metadata
    parsed._generatedAt = currentIso;

    return res.json(parsed);
  } catch (err) {
    console.error("LLM trip plan error:", err);
    return res
      .status(500)
      .json({ error: "Internal error generating trip plan" });
  }
}

module.exports = { handleLLMTripPlan };
