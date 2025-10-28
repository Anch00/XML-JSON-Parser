const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function scrapeAttractionsPage(url) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  const items = await page.evaluate(() => {
    const results = [];
    const candidates = Array.from(
      document.querySelectorAll("h2, h3, .card__title, .teaser__title")
    );
    for (const el of candidates) {
      const name = el.textContent?.trim();
      if (!name || name.length < 3) continue;
      let description = "";
      let p = el.nextElementSibling;
      let steps = 0;
      while (p && steps < 5) {
        if (p.tagName && p.tagName.toLowerCase() === "p") {
          description = p.textContent?.trim() || "";
          break;
        }
        const innerP = p.querySelector && p.querySelector("p");
        if (innerP) {
          description = innerP.textContent?.trim() || "";
          break;
        }
        p = p.nextElementSibling;
        steps++;
      }
      results.push({ name, description });
      if (results.length >= 50) break;
    }
    if (results.length === 0) {
      const anchors = Array.from(document.querySelectorAll("a"));
      for (const a of anchors) {
        const txt = a.textContent?.trim();
        if (txt && txt.length > 8 && txt.length < 80) {
          results.push({ name: txt, description: "" });
          if (results.length >= 50) break;
        }
      }
    }
    return results;
  });

  await browser.close();
  return items;
}

async function handleScrape(req, res) {
  const url =
    req.query.url || "https://www.visitljubljana.si/en/visitors/what-to-see/";
  try {
    const attractions = await scrapeAttractionsPage(url);
    const dataPath = path.join(__dirname, "..", "..", "data");
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
    const filePath = path.join(dataPath, "attractions.json");
    fs.writeFileSync(filePath, JSON.stringify(attractions, null, 2), "utf8");
    res.json({ ok: true, source: url, count: attractions.length, attractions });
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).json({ error: String(err) });
  }
}

module.exports = { handleScrape };
