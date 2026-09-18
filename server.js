// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { init } = require('./db/database');

// Create tables + seed the disease/symptom reference data on startup
init();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(require('path').join(__dirname, 'public')));

// Simple request log (handy while developing)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/mood'));
app.use('/api', require('./routes/medications'));
app.use('/api', require('./routes/appointments'));
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/symptoms'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  MediAssist backend running → http://localhost:${PORT}`);
  console.log(`  Database file              → ${require('path').join(__dirname, 'mediassist.db')}\n`);
});
