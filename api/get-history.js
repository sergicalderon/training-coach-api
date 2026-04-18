export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV no configurado" });

  try {
    const headers = { Authorization: `Bearer ${kvToken}` };

    const listRes = await fetch(`${kvUrl}/lrange/plan:history/0/50`, { headers });
    const listJson = await listRes.json();
    const dates = listJson.result || [];

    const unique = [...new Set(dates)].slice(0, 20);

    const plans = await Promise.all(unique.map(async (date) => {
      const r = await fetch(`${kvUrl}/get/plan:${date}`, { headers });
      const j = await r.json();
      if (!j.result) return null;
      try {
        const parsed = JSON.parse(j.result);
        const data = JSON.parse(parsed.value || j.result);
        return { date, ...data };
      } catch { return null; }
    }));

    res.status(200).json({ plans: plans.filter(Boolean) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
