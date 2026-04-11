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
    let body = "";
    if (typeof req.body === "string") {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString("utf8");
    } else {
      body = JSON.stringify(req.body);
    }

    const today = new Date().toISOString().slice(0, 10);
    const payload = JSON.stringify(body);

    await fetch(`${kvUrl}/set/workouts:latest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: payload,
    });

    await fetch(`${kvUrl}/set/workouts:${today}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: payload,
    });

    res.status(200).json({ ok: true, date: today, bytes: body.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
