// routes/chat.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { findMatches } = require('../db/symptomMatcher');
const { MODE_PROMPTS } = require('../modePrompts');

// gemini-2.5-flash is a safe, widely-available fallback if your key
// doesn't have access to the newer gemini-3.5-flash yet.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

router.post('/chat', async (req, res) => {
  try {
    const { mode = 'symptoms', message = '', history = [] } = req.body;

    if (!MODE_PROMPTS[mode]) {
      return res.status(400).json({ error: `Unknown mode: ${mode}` });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to your .env file.' });
    }

    let systemPrompt = MODE_PROMPTS[mode];

    // Ground symptom-mode answers in the seeded database
    let matchedDiseases = [];
    if (mode === 'symptoms' && message) {
      matchedDiseases = findMatches(message, 3);
      if (matchedDiseases.length) {
        const refText = matchedDiseases.map(d =>
          `- ${d.name} (severity: ${d.severity}): symptoms include ${d.symptoms}. ${d.description} Suggested precautions: ${d.precautions}.`
        ).join('\n');
        systemPrompt += `\n\nReference data from the medical database (cross-check against this, but you are not limited to it):\n${refText}`;
      }
    }

    // Log the user's message
    db.prepare('INSERT INTO chat_messages (mode, role, content) VALUES (?,?,?)').run(mode, 'user', message);

    // Gemini uses "model" instead of "assistant" for the AI's turns,
    // and wraps text in a parts[] array rather than a plain string.
    const contents = [...history, { role: 'user', content: message }]
      .filter(m => m.content && m.content.trim().length > 0)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1000 }
      })
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.json().catch(() => ({}));
      return res.status(apiRes.status).json({ error: errBody.error?.message || 'Gemini API error' });
    }

    const data = await apiRes.json();
    const candidate = data.candidates?.[0];

    if (!candidate) {
      // Most commonly happens when Gemini's safety filters block the response
      const blockReason = data.promptFeedback?.blockReason;
      return res.status(502).json({ error: blockReason ? `Response blocked: ${blockReason}` : 'No response from Gemini' });
    }

    const reply = (candidate.content?.parts || []).map(p => p.text || '').join('');

    db.prepare('INSERT INTO chat_messages (mode, role, content) VALUES (?,?,?)').run(mode, 'assistant', reply);

    res.json({ reply, matchedDiseases: matchedDiseases.map(d => ({ name: d.name, severity: d.severity })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

router.get('/chat/history', (req, res) => {
  const mode = req.query.mode;
  const rows = mode
    ? db.prepare('SELECT * FROM chat_messages WHERE mode = ? ORDER BY id ASC').all(mode)
    : db.prepare('SELECT * FROM chat_messages ORDER BY id ASC').all();
  res.json(rows);
});

module.exports = router;
