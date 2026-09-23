// routes/symptoms.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { findMatches } = require('../db/symptomMatcher');

// List all diseases in the reference database
router.get('/diseases', (req, res) => {
  res.json(db.prepare('SELECT * FROM diseases ORDER BY name ASC').all());
});

// Search diseases by free-text symptom description
// e.g. GET /api/symptoms/search?q=fever%20and%20sore%20throat
router.get('/symptoms/search', (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) return res.json([]);
  res.json(findMatches(q, 5));
});

module.exports = router;
