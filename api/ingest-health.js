export const config = { api: { bodyParser: false } };

function extractJSON(body) {
  const start = body.indexOf("\r\n\r\n");
  if (start === -1) return body;
  const jsonStart = start + 4;
  const boundaryEnd = body.lastIndexOf("\r\n--");
  if (boundaryEnd === -1) return body.slice(jsonStart);
  return body.slice(jsonStart, boundaryEnd);
}

function getMetricByDay(metrics, name) {
  const metric = metrics.find(m => m.name === name);
  if (!metric) return {};
  const byDay = {};
  metric.data.forEach(entry => {
    const date = entry.date.slice(0, 10);
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(entry);
  });
  return byDay;
}

function avgQty(entries) {
  if (!entries || !entries.length) return null;
  const vals = entries.map(e => e.qty).filter(v => v != null && !isNaN(v));
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function lastQty(entries) {
  if (!entries || !entries.length) return null;
  const vals = entries.map(e => e.qty).filter(v => v != null && !isNaN(v));
  return vals.length ? vals[vals.length - 1] : null;
}

function splitByDay(json) {
  const metrics = json?.data?.metrics || [];
  const allDates = new Set();

  metrics.forEach(m => {
    if (m.name === "sleep_analysis") {
      m.data.forEach(e => allDates.add(e.date.slice(0, 10)));
    } else {
      m.data.forEach(e => allDates.add(e.date.slice(0, 10)));
    }
  });

  const byDay = {};
  allDates.forEach(date => {
    const hrv = getMetricByDay(metrics, "heart_rate_variability")[date] || [];
    const hr = getMetricByDay(metrics, "resting_heart_rate")[date] || [];
    const sleep = metrics.find(m => m.name === "sleep_analysis")?.data?.find(e => e.date.slice(0, 10) === date);
    const spo2 = getMetricByDay(metrics, "blood_oxygen_saturation")[date] || [];
    const vo2 = getMetricByDay(metrics, "vo2_max")[date] || [];
    const weight = getMetricByDay(metrics, "weight_body_mass")[date] || [];
    const fat = getMetricByDay(metrics, "body_fat_percentage")[date] || [];
    const steps = getMetricByDay(metrics, "step_count")[date] || [];
    const cardioRecovery = getMetricByDay(metrics, "cardio_recovery")[date] || [];
    const wristTemp = getMetricByDay(metrics, "apple_sleeping_wrist_temperature")[date] || [];

    byDay[date] = {
      date,
      hrv: { avg: avgQty(hrv), last: lastQty(hrv) },
      hrResting: { avg: avgQty(hr), last: lastQty(hr) },
      sleep: sleep ? {
        total: sleep.totalSleep,
        deep: sleep.deep,
        rem: sleep.rem,
        core: sleep.core,
        awake: sleep.awake,
        start: sleep.sleepStart,
        end: sleep.sleepEnd,
      } : null,
      spo2: { avg: avgQty(spo2), last: lastQty(spo2) },
      vo2max: { avg: avgQty(vo2), last: lastQty(vo2) },
      weight: { avg: avgQty(weight), last: lastQty(weight) },
      fatPct: { avg: avgQty(fat), last: lastQty(fat) },
      steps: { total: steps.reduce((s, e) => s + (e.qty || 0), 0) },
      cardioRecovery: { avg: avgQty(cardioRecovery), last: lastQty(cardioRecovery) },
      wristTemp: { avg: avgQty(wristTemp) },
    };
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

    const jsonStr = extractJSON(raw);
    let json;
    try {
      json = JSON.parse(jsonStr);
    } catch(parseErr) {
      return res.status(400).json({ error: "JSON parse failed: " + parseErr.message, length: raw.length });
    }
    const byDay = splitByDay(json);
    const dates = Object.keys(byDay).sort();

    const headers = { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" };

    await Promise.all(dates.map(date => {
      return fetch(`${kvUrl}/set/health:${date}`, {
        method: "POST", headers,
        body: JSON.stringify({ value: JSON.stringify(byDay[date]) }),
      });
    }));

    const latest = dates[dates.length - 1];
    if (latest) {
      await fetch(`${kvUrl}/set/health:latest`, {
        method: "POST", headers,
        body: JSON.stringify({ value: JSON.stringify(byDay[latest]) }),
      });
    }

    res.status(200).json({ ok: true, days: dates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
