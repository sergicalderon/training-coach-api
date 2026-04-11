export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, code } = req.query;

  if (action === "exchange" && code) {
    try {
      const r = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code"
        })
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: "Error al intercambiar token" });
    }
  }

  const token = process.env.STRAVA_TOKEN;
  if (!token) return res.status(500).json({ error: "Token no configurado" });

  try {
    const response = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=15",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: "Error al conectar con Strava" });
  }
}
