// routes/mood.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/mood', (req, res) => {
  const rows = db.prepare('SELECT * FROM mood_logs ORDER BY id DESC LIMIT 7').all();
  res.json(rows.reverse());
});

router.post('/mood', (req, res) => {
  const { score, label, note } = req.body;
  if (!score || score < 1 || score > 10) {
    return res.status(400).json({ error: 'score must be a number between 1 and 10' });
  }
  const result = db.prepare('INSERT INTO mood_logs (score, label, note) VALUES (?,?,?)').run(score, label || null, note || null);
  res.status(201).json({ id: result.lastInsertRowid, score, label, note });
});

module.exports = router;
