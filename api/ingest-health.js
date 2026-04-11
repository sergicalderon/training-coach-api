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
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const today = new Date().toISOString().slice(0, 10);

    await fetch(`${kvUrl}/set/health:${today}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: body }),
    });

    await fetch(`${kvUrl}/set/health:latest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: body }),
    });

    res.status(200).json({ ok: true, date: today });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
