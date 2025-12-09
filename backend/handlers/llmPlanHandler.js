const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure API key is provided via environment
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Use only the model provided via environment
const SELECTED_MODEL = process.env.GEMINI_MODEL;

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

    // Ensure a model is specified
    if (!SELECTED_MODEL) {
      return res.status(400).json({
        error: "GEMINI_MODEL is not set in .env",
        hint: "Set GEMINI_MODEL=gemini-3.0-pro (or your available model) and restart the backend.",
      });
    }
    const model = genAI.getGenerativeModel({ model: SELECTED_MODEL });
    // Optional tiny availability check (fast) to confirm the selected model works
    try {
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
      });
    } catch (e) {
      console.error(
        "Selected Gemini model seems unavailable:",
        SELECTED_MODEL,
        e?.status || e?.message || e
      );
      return res.status(502).json({
        error: `Selected model '${SELECTED_MODEL}' is not available or unsupported`,
        details: e?.message || String(e),
        hint: "Update GEMINI_MODEL in .env to a supported model and restart.",
      });
    }
    console.log("[LLM] Using Gemini model:", SELECTED_MODEL);

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
