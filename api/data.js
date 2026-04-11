export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV no configurado" });

  try {
    const [healthRes, workoutsRes] = await Promise.all([
      fetch(`${kvUrl}/get/health:latest`, { headers: { Authorization: `Bearer ${kvToken}` } }),
      fetch(`${kvUrl}/get/workouts:latest`, { headers: { Authorization: `Bearer ${kvToken}` } }),
    ]);

    const healthJson = await healthRes.json();
    const workoutsJson = await workoutsRes.json();

    const unwrap = raw => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.value ?? parsed;
      } catch { return raw; }
    };

    const health = unwrap(healthJson.result);
    const workouts = unwrap(workoutsJson.result);

    res.status(200).json({
      health,
      workouts,
      debug_health: typeof health === "string" ? health.slice(0, 500) : null,
      debug_workouts: typeof workouts === "string" ? workouts.slice(0, 500) : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
