// routes/health.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// Health log (free-text running journal)
router.get('/health-log', (req, res) => {
  res.json(db.prepare('SELECT * FROM health_logs ORDER BY id DESC LIMIT 20').all());
});

router.post('/health-log', (req, res) => {
  const { entry, category } = req.body;
  if (!entry) return res.status(400).json({ error: 'entry is required' });
  const result = db.prepare('INSERT INTO health_logs (entry, category) VALUES (?,?)').run(entry, category || null);
  res.status(201).json({ id: result.lastInsertRowid, entry, category });
});

// Vitals (BP, heart rate, blood sugar, temperature)
router.get('/vitals', (req, res) => {
  const row = db.prepare('SELECT * FROM vitals ORDER BY id DESC LIMIT 1').get();
  res.json(row || {});
});

router.post('/vitals', (req, res) => {
  const { blood_pressure, heart_rate, blood_sugar, temperature } = req.body;
  const result = db.prepare(
    'INSERT INTO vitals (blood_pressure, heart_rate, blood_sugar, temperature) VALUES (?,?,?,?)'
  ).run(blood_pressure || null, heart_rate || null, blood_sugar || null, temperature || null);
  res.status(201).json({ id: result.lastInsertRowid, blood_pressure, heart_rate, blood_sugar, temperature });
});

module.exports = router;
