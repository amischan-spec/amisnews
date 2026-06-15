// 自己包晒:抓取 + 解析所有 RSS,並加埋香港天文台天氣,回傳 JSON。
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
      desc: stripTags(pick(b, "description")).slice(0, 160),
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
    const items = parseRss(xml).slice(0, 25);
    if (!items.length) throw new Error("empty");
    return items;
  } finally {
    clearTimeout(timer);
  }
}

// 香港天文台「本港地區天氣報告」
const HKO = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";
const ICON = {
  50:["☀️","天晴"],51:["🌤️","部分時間有陽光"],52:["🌤️","短暫時間有陽光"],
  53:["🌦️","短暫陽光有驟雨"],54:["🌦️","短暫陽光有驟雨"],
  60:["☁️","多雲"],61:["☁️","密雲"],62:["🌧️","微雨"],63:["🌧️","雨"],64:["🌧️","大雨"],65:["⛈️","雷暴"],
  70:["🌙","天色良好"],71:["🌙","天色良好"],72:["🌙","天色良好"],73:["🌙","天色良好"],74:["🌙","天色良好"],
  75:["🌙","天色良好"],76:["🌥️","大致多雲"],77:["🌙","天色大致良好"],
  80:["💨","大風"],81:["🌬️","乾燥"],82:["💧","潮濕"],83:["🌫️","霧"],84:["🌫️","薄霧"],85:["🌁","煙霞"],
  90:["🥵","熱"],91:["🌡️","暖"],92:["🍃","涼"],93:["🥶","冷"]
};

async function fetchWeather() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(HKO, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    const td = (j.temperature && j.temperature.data) || [];
    const hko = td.find(x => x.place === "香港天文台") || td[0];
    const temp = hko ? Math.round(hko.value) : null;
    const hum = (j.humidity && j.humidity.data && j.humidity.data[0]) ? j.humidity.data[0].value : null;
    const code = (j.icon && j.icon[0]) || null;
    const ic = ICON[code] || ["", ""];
    if (temp == null) return null;
    return { temp, humidity: hum, emoji: ic[0], desc: ic[1] };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function aggregate() {
  const [feeds, weather] = await Promise.all([
    Promise.all(FEEDS.map(async (f) => {
      try {
        const items = await fetchFeed(f);
        return { outlet: f.outlet, cat: f.cat, lead: !!f.lead, ok: true, items };
      } catch (e) {
        return { outlet: f.outlet, cat: f.cat, lead: !!f.lead, ok: false, items: [] };
      }
    })),
    fetchWeather(),
  ]);
  return { generatedAt: new Date().toISOString(), weather, feeds };
}

export default async () => {
  try {
    const data = await aggregate();
    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
        "netlify-cdn-cache-control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};
