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
    const { plan, context } = req.body;
    if (!plan) return res.status(400).json({ error: "Plan requerido" });

    const now = new Date();
    const data = {
      plan,
      context: context || {},
      savedAt: now.toISOString(),
      weekStart: getMonday(),
    };

    const payload = JSON.stringify({ value: JSON.stringify(data) });
    const headers = { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" };

    await Promise.all([
      fetch(`${kvUrl}/set/plan:current`, { method: "POST", headers, body: payload }),
      fetch(`${kvUrl}/set/plan:${now.toISOString().slice(0, 10)}`, { method: "POST", headers, body: payload }),
    ]);

    await fetch(`${kvUrl}/lpush/plan:history`, {
      method: "POST",
      headers,
      body: JSON.stringify({ value: now.toISOString().slice(0, 10) }),
    });

    res.status(200).json({ ok: true, savedAt: data.savedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
