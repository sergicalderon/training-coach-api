export const config = { api: { bodyParser: false } };

function extractCSV(body) {
  const start = body.indexOf("\r\n\r\n");
  if (start === -1) return body;
  const csvStart = start + 4;
  const boundaryEnd = body.lastIndexOf("\r\n--");
  if (boundaryEnd === -1) return body.slice(csvStart);
  return body.slice(csvStart, boundaryEnd);
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
    const today = new Date().toISOString().slice(0, 10);

    await fetch(`${kvUrl}/set/workouts:latest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: csv }),
    });

    await fetch(`${kvUrl}/set/workouts:${today}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: csv }),
    });

    res.status(200).json({ ok: true, date: today, bytes: csv.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
