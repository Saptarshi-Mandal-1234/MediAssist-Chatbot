// routes/medications.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/medications', (req, res) => {
  res.json(db.prepare('SELECT * FROM medications ORDER BY id DESC').all());
});

router.post('/medications', (req, res) => {
  const { name, dosage, frequency, time_of_day } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare(
    'INSERT INTO medications (name, dosage, frequency, time_of_day) VALUES (?,?,?,?)'
  ).run(name, dosage || null, frequency || null, time_of_day || null);
  res.status(201).json({ id: result.lastInsertRowid, name, dosage, frequency, time_of_day, status: 'due' });
});

router.patch('/medications/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE medications SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ updated: true });
});

router.delete('/medications/:id', (req, res) => {
  db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
