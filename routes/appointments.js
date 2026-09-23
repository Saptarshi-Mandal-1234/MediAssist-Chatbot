// routes/appointments.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/appointments', (req, res) => {
  res.json(db.prepare('SELECT * FROM appointments ORDER BY appointment_time ASC').all());
});

router.post('/appointments', (req, res) => {
  const { title, doctor, appointment_time, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const result = db.prepare(
    'INSERT INTO appointments (title, doctor, appointment_time, notes) VALUES (?,?,?,?)'
  ).run(title, doctor || null, appointment_time || null, notes || null);
  res.status(201).json({ id: result.lastInsertRowid, title, doctor, appointment_time, notes });
});

router.delete('/appointments/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
