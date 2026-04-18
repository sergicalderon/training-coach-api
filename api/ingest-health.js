export const config = { api: { bodyParser: false } };

function extractCSV(body) {
  const start = body.indexOf("\r\n\r\n");
  if (start === -1) return body;
  const csvStart = start + 4;
  const boundaryEnd = body.lastIndexOf("\r\n--");
  if (boundaryEnd === -1) return body.slice(csvStart);
  return body.slice(csvStart, boundaryEnd);
}

function splitByDay(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0];
  const byDay = {};
  lines.slice(1).forEach(line => {
    const date = line.slice(0, 10);
    if (!date.match(/^\d{4}-\d{2}-\d{2}/)) return;
    if (!byDay[date]) byDay[date] = [headers];
    byDay[date].push(line);
  });
  return byDay;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV no configurado" });

  try {
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => { data += chunk.toString(); });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const csv = extractCSV(raw);
    const byDay = splitByDay(csv);
    const dates = Object.keys(byDay);

    const headers = { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" };

    await Promise.all(dates.map(date => {
      const dayCSV = byDay[date].join("\n");
      const payload = JSON.stringify({ value: dayCSV });
      return fetch(`${kvUrl}/set/health:${date}`, {
        method: "POST", headers, body: payload
      });
    }));

    const latest = dates.sort().pop();
    if (latest) {
      await fetch(`${kvUrl}/set/health:latest`, {
        method: "POST", headers,
        body: JSON.stringify({ value: byDay[latest].join("\n") })
      });
    }

    res.status(200).json({ ok: true, days: dates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
