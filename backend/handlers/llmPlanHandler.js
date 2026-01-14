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
 * Expects JSON body { city: string, country?: string, startDate: string (YYYY-MM-DD), endDate?: string (YYYY-MM-DD), attractions?: Array }
 * Returns structured JSON matching TripPlan schema.
 */
async function handleLLMTripPlan(req, res) {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "Gemini API not configured" });
    }

    const { city, country, startDate, endDate, attractions } = req.body || {};
    if (!city || !startDate) {
      return res
        .status(400)
        .json({ error: "Missing required fields: city, startDate" });
    }

    // Limit trip duration to 5 days maximum for performance
    let effectiveEndDate = endDate;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 5) {
        const maxEnd = new Date(start);
        maxEnd.setDate(start.getDate() + 5);
        effectiveEndDate = maxEnd.toISOString().split("T")[0];
        console.log(
          `[LLM] Trip duration limited to 5 days: ${startDate} to ${effectiveEndDate}`
        );
      }
    }

    // Ensure a model is specified
    if (!SELECTED_MODEL) {
      return res.status(400).json({
        error: "GEMINI_MODEL is not set in .env",
        hint: "Set GEMINI_MODEL=gemini-3.0-pro (or your available model) and restart the backend.",
      });
    }
    const model = genAI.getGenerativeModel({ model: SELECTED_MODEL });
    console.log("[LLM] Using Gemini model:", SELECTED_MODEL);

    const now = new Date();
    const currentIso = now.toISOString();

    // Build attractions context if provided
    let attractionsContext = "";
    if (attractions && Array.isArray(attractions) && attractions.length > 0) {
      attractionsContext = `\n\nThe user has provided the following attractions they want to visit:\n${attractions
        .map((a) => `- ${a.name}${a.description ? ": " + a.description : ""}`)
        .join(
          "\n"
        )}\n\nPlease prioritize including these attractions in the itinerary when appropriate.`;
    }

    // System + user prompt: ask for strict JSON conforming to schema
    const prompt = `Plan ${city}${
      country ? ", " + country : ""
    } itinerary ${startDate} to ${
      effectiveEndDate || startDate
    }.${attractionsContext}

JSON format:
{"destination":"${city}","startDate":"${startDate}","endDate":"${
      endDate || startDate
    }","googleMapsRoute":"https://www.google.com/maps/dir/?api=1&origin=First&destination=Last&waypoints=Loc2|Loc3","days":[{"date":"yyyy-mm-dd","weatherNote":"Sunny 20C","summary":"brief","activities":[{"time":"09:00","title":"Location","type":"sightseeing","address":"short","durationMinutes":60,"notes":"brief","costEstimate":10}]}],"tips":["tip1","tip2"]}

Rules:
- 3-4 activities/day max
- Keep all text fields SHORT (notes: 5 words max, weatherNote: 3 words)
- Brief addresses
- Valid JSON only`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5, // Balanced: speed + creativity
        maxOutputTokens: 8192, // More room for detailed plans
      },
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
      console.error("[LLM] JSON parse error:", e.message);
      console.error(
        "[LLM] Raw response (first 500 chars):",
        rawText.substring(0, 500)
      );
      return res.status(502).json({
        error: "Failed to parse JSON from model",
        raw: rawText.substring(0, 1000),
        parseError: e.message,
      });
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
