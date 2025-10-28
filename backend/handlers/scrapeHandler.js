const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function scrapeAttractionsPage(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Site-specific: Atlas Obscura "things-to-do" pages (e.g., Berlin)
  if (/atlasobscura\.com\/things-to-do\//i.test(url)) {
    try {
      // Try to load more results a few times if a Load More button exists
      for (let i = 0; i < 5; i++) {
        const hadMore = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button, a"));
          const load = btns.find((b) => {
            const t = (b.textContent || "").toLowerCase();
            const id = (b.id || "").toLowerCase();
            const aria = (b.getAttribute("aria-label") || "").toLowerCase();
            const dataTestId = (
              b.getAttribute("data-testid") || ""
            ).toLowerCase();
            return (
              t.includes("load more") ||
              t.includes("show more") ||
              id.includes("load") ||
              aria.includes("load more") ||
              dataTestId.includes("load-more")
            );
          });
          if (load) {
            load.click();
            return true;
          }
          return false;
        });
        if (!hadMore) break;
        await page.waitForTimeout(1500 + i * 250);
      }

      const aoItems = await page.evaluate(() => {
        const out = [];
        const seen = new Set();

        // Primary selector based on observed classes
        const titleSpans = Array.from(
          document.querySelectorAll(
            "h4.text-xl.font-semibold.leading-5.tracking-wider span"
          )
        );
        for (const s of titleSpans) {
          const name = (s.textContent || "").trim();
          if (!name || name.length < 2 || seen.has(name)) continue;
          out.push({ name, description: "" });
          seen.add(name);
          if (out.length >= 300) break;
        }

        // Fallback: filter by classList if classes are space/newline separated or changed order
        if (out.length === 0) {
          const spans = Array.from(document.querySelectorAll("h4 span"));
          for (const s of spans) {
            const parent = s.closest("h4");
            const cls = (parent && (parent.getAttribute("class") || "")).split(
              /\s+/
            );
            const needed = [
              "text-xl",
              "font-semibold",
              "leading-5",
              "tracking-wider",
            ];
            const ok = needed.every((c) => cls.includes(c));
            if (!ok) continue;
            const name = (s.textContent || "").trim();
            if (name && !seen.has(name)) {
              out.push({ name, description: "" });
              seen.add(name);
              if (out.length >= 300) break;
            }
          }
        }

        // Last-resort: generic cards
        if (out.length === 0) {
          const cards = Array.from(
            document.querySelectorAll('[class*="card"], article, li')
          );
          for (const c of cards) {
            const h = c.querySelector("h3 span, h4 span, h3, h4");
            if (!h) continue;
            const name = (h.textContent || "").trim();
            if (name && name.length > 2 && !seen.has(name)) {
              out.push({ name, description: "" });
              seen.add(name);
              if (out.length >= 300) break;
            }
          }
        }
        return out;
      });

      await browser.close();
      return aoItems;
    } catch (e) {
      // fall back to generic
    }
  }

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
    req.query.url || "https://www.atlasobscura.com/things-to-do/berlin-germany";
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
