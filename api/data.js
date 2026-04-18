export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV no configurado" });

  const get = async (key) => {
    const r = await fetch(`${kvUrl}/get/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const j = await r.json();
    if (!j.result) return null;
    try {
      const p = JSON.parse(j.result);
      const val = p?.value ?? p;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    } catch { return j.result; }
  };

  try {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const [healthLatest, workoutsLatest, ...historyResults] = await Promise.all([
      get("health:latest"),
      get("workouts:latest"),
      ...days.map(d => get(`health:${d}`))
    ]);

    const history = days.map((date, i) => ({
      date,
      data: historyResults[i]
    })).filter(d => d.data);

    res.status(200).json({
      health: healthLatest,
      workouts: workoutsLatest,
      history,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
