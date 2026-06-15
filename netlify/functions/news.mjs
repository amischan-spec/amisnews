// 自己包晒:抓取 + 解析所有 RSS,然後回傳 JSON。唔需要 import 其他檔。
// 想加減傳媒/頻道,改下面 FEEDS 即可。

const FEEDS = [
  { outlet: "RTHK 香港電台", cat: "本地",     url: "https://rthk.hk/rthk/news/rss/c_expressnews_clocal.xml", lead: true },
  { outlet: "RTHK 香港電台", cat: "財經",     url: "https://rthk.hk/rthk/news/rss/c_expressnews_cfinance.xml" },
  { outlet: "RTHK 香港電台", cat: "大中華",   url: "https://rthk.hk/rthk/news/rss/c_expressnews_greaterchina.xml" },
  { outlet: "RTHK 香港電台", cat: "國際",     url: "https://rthk.hk/rthk/news/rss/c_expressnews_cinternational.xml" },
  { outlet: "RTHK 香港電台", cat: "體育",     url: "https://rthk.hk/rthk/news/rss/c_expressnews_csport.xml" },
  { outlet: "政府新聞網",    cat: "新聞公報", url: "http://www.info.gov.hk/gia/rss/general_zh.xml" },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function stripCdata(s) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"); }
function decode(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&");
}
function stripTags(s) { return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

function pick(block, tag) {
  const m = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i").exec(block);
  return m ? decode(stripCdata(m[1])).trim() : "";
}

function parseRss(xml) {
  const out = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const title = pick(b, "title");
    if (!title) continue;
    out.push({
      title,
      link: pick(b, "link"),
      pub: pick(b, "pubDate"),
      desc: stripTags(pick(b, "description")),
    });
  }
  return out;
}

async function fetchFeed(feed) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const xml = await res.text();
    const items = parseRss(xml).slice(0, feed.lead ? 8 : 7);
    if (!items.length) throw new Error("empty");
    return items;
  } finally {
    clearTimeout(timer);
  }
}

async function aggregate() {
  const feeds = await Promise.all(FEEDS.map(async (f) => {
    try {
      const items = await fetchFeed(f);
      return { outlet: f.outlet, cat: f.cat, lead: !!f.lead, ok: true, items };
    } catch (e) {
      return { outlet: f.outlet, cat: f.cat, lead: !!f.lead, ok: false, items: [] };
    }
  }));
  return { generatedAt: new Date().toISOString(), feeds };
}

export default async () => {
  try {
    const data = await aggregate();
