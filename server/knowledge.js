/**
 * Knowledge agent — auto-train the receptionist from a website.
 * -------------------------------------------------------------
 * Like the market leaders (Rosie etc.): give it a URL and it pulls the business
 * name, opening hours, services, contact details and an FAQ summary, so a new
 * client's assistant configures itself instead of being typed in by hand.
 *
 * Endpoint: POST /scan-website { url } -> { knowledge: {...} }
 * Also used by the provisioning pipeline on sign-up.
 *
 * Best-effort, no heavy deps. The agency reviews/edits before going live.
 */

function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
function pick(re, html) { const m = html.match(re); return m ? m[1].trim() : ""; }

// Extract a knowledge object from raw HTML.
function extractKnowledge(html, url) {
  const title = pick(/<title[^>]*>([^<]+)<\/title>/i, html);
  const metaDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, html)
    || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i, html);
  const text = stripTags(html);

  // headings + list items -> candidate services
  const headings = (html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi) || []).map((h) => stripTags(h)).filter(Boolean);
  const lis = (html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((l) => stripTags(l)).filter((s) => s && s.length < 40);
  const serviceWords = /(repair|service|install|treatment|clean|check[- ]?up|consult|whiten|filling|cut|colour|color|wax|massage|facial|boiler|leak|drain|heating|bathroom|implant|invisalign|grooming|valet|mot)/i;
  const services = [...new Set([...headings, ...lis].filter((s) => serviceWords.test(s)))].slice(0, 10).join(", ");

  // opening hours — find a chunk mentioning days + times
  let hours = "";
  const hoursChunk = text.match(/((mon|tue|wed|thu|fri|sat|sun)[a-z]*[^.]{0,80}?\d{1,2}\s?(?:am|pm|:\d{2})[^.]{0,80})/i);
  if (hoursChunk) hours = hoursChunk[1].replace(/\s+/g, " ").trim().slice(0, 160);

  const phone = pick(/href=["']tel:([+\d][\d\s()-]{6,})["']/i, html) || (text.match(/\b(?:\+?\d[\d\s()-]{8,}\d)\b/) || [""])[0].trim();
  const email = pick(/href=["']mailto:([^"']+)["']/i, html) || (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [""])[0];

  // crude area: an Irish-ish address / "based in X"
  const area = (text.match(/based in ([A-Z][a-zA-Z'\- ]{2,30})/) || [])[1]
    || (text.match(/\b(Dublin\s?\d{0,2}|Ballsbridge|Blackrock|Dalkey|Ranelagh|Rathmines|Sandymount|Stillorgan|Cork|Galway|Limerick)\b/) || [])[1] || "";

  const businessName = (title.split(/[|\-–—]/)[0] || "").trim();
  const faq = (metaDesc || text.slice(0, 240)).trim();

  return {
    source: url || "",
    businessName, area, hours, services, phone, email, faq,
    confidence: (services ? 1 : 0) + (hours ? 1 : 0) + (phone ? 1 : 0) + (businessName ? 1 : 0),
    note: "Auto-extracted from the website — review and tidy before going live.",
  };
}

async function scanWebsite(url) {
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const r = await fetch(url, { headers: { "User-Agent": "SouthlineKnowledgeBot/1.0" } });
  if (!r.ok) throw new Error("Couldn't fetch site (" + r.status + ")");
  const html = await r.text();
  return extractKnowledge(html, url);
}

function mountKnowledge(app) {
  app.post("/scan-website", async (req, res) => {
    const url = (req.body && req.body.url) || "";
    if (!url) return res.status(400).json({ error: "Provide a website url." });
    try { res.json({ knowledge: await scanWebsite(url) }); }
    catch (e) { res.status(502).json({ error: e.message }); }
  });
  console.log("Knowledge agent mounted (POST /scan-website)");
}

module.exports = { mountKnowledge, scanWebsite, extractKnowledge };
