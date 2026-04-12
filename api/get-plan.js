export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV no configurado" });

  try {
    const r = await fetch(`${kvUrl}/get/plan:current`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const json = await r.json();

    if (!json.result) return res.status(200).json({ plan: null });

    const data = JSON.parse(JSON.parse(json.result).value || json.result);
    res.status(200).json(data);
  } catch (e) {
    res.status(200).json({ plan: null });
  }
}
