const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Config
const PORT = 3002;
const SESSION_NOTES_PATH = '/root/share/05-system/session-notes.md';
const STATUS_JSON_PATH = '/root/share/workflow/status.json';
const SHARE_DIR = '/root/share';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── DATA LAYER ───────────────────────────────────────────────────────────────

function parseSessionNotes() {
  try {
    if (!fs.existsSync(SESSION_NOTES_PATH)) return [];
    const content = fs.readFileSync(SESSION_NOTES_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().startsWith('- '));
    const entries = [];
    let currentDate = null;

    const allLines = content.split('\n');
    for (const line of allLines) {
      const dateMatch = line.match(/^#+ (.+)/);
      if (dateMatch) { currentDate = dateMatch[1].trim(); continue; }
      if (line.trim().startsWith('- ')) {
        const text = line.trim().slice(2).trim();
        const timeMatch = text.match(/^\[(\d{2}:\d{2})\]\s*(.*)/);
        entries.push({
          date: currentDate || 'Unbekannt',
          time: timeMatch ? timeMatch[1] : null,
          text: timeMatch ? timeMatch[2] : text,
          raw: text,
          id: entries.length + 1
        });
      }
    }
    return entries.reverse();
  } catch (e) { return []; }
}

function getAgentStatus() {
  try {
    if (!fs.existsSync(STATUS_JSON_PATH)) {
      return { status: 'idle', agents: [], lastUpdate: null };
    }
    const data = JSON.parse(fs.readFileSync(STATUS_JSON_PATH, 'utf8'));
    return data;
  } catch (e) { return { status: 'idle', agents: [] }; }
}

function getStats() {
  const sessions = parseSessionNotes();
  const today = new Date().toLocaleDateString('de-DE');
  const todaySessions = sessions.filter(s => s.date && s.date.includes(
    new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  ));

  // Calculate activity by day (last 14 days)
  const activityByDay = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('de-DE');
    activityByDay[key] = 0;
  }
  sessions.forEach(s => {
    if (s.date && activityByDay[s.date] !== undefined) {
      activityByDay[s.date]++;
    }
  });

  // Streak calculation
  let streak = 0;
  const days = Object.keys(activityByDay).reverse();
  for (const day of days) {
    if (activityByDay[day] > 0) streak++;
    else break;
  }

  // Uptime from process
  const uptimeHours = Math.floor(process.uptime() / 3600);
  const uptimeMin = Math.floor((process.uptime() % 3600) / 60);

  return {
    totalSessions: sessions.length,
    todayActivities: todaySessions.length,
    streak,
    uptimeHours,
    uptimeMin,
    activityByDay,
    lastActivity: sessions[0] || null
  };
}

function getProjects() {
  const projects = [];
  const projectDirs = [
    { name: 'Gary Command Center', repo: 'gary-command-center', color: '#6366f1' },
    { name: 'Masterarbeit Proposal', repo: 'masterarbeit-proposal', color: '#22c55e' },
    { name: 'Portfolio', repo: 'portfolio', color: '#f59e0b' },
    { name: 'Gary Briefing System', repo: 'gary-briefing-system', color: '#ec4899' },
    { name: 'Trading Bot V2', repo: 'trading-bot-v2', color: '#0ea5e9' }
  ];
  return projectDirs;
}

// ─── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json(getAgentStatus());
});

app.get('/api/sessions', (req, res) => {
  const sessions = parseSessionNotes();
  const limit = parseInt(req.query.limit) || 100;
  const search = req.query.search || '';
  const filtered = search
    ? sessions.filter(s => s.text.toLowerCase().includes(search.toLowerCase()))
    : sessions;
  res.json({ entries: filtered.slice(0, limit), total: filtered.length });
});

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.get('/api/projects', (req, res) => {
  res.json(getProjects());
});

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────

const clients = new Set();
let lastSessionCount = parseSessionNotes().length;
let lastStatus = JSON.stringify(getAgentStatus());

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send initial data
  ws.send(JSON.stringify({
    type: 'init',
    stats: getStats(),
    sessions: parseSessionNotes().slice(0, 20),
    agentStatus: getAgentStatus()
  }));

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// File watcher
const watcher = chokidar.watch([SESSION_NOTES_PATH, STATUS_JSON_PATH], {
  persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 500 }
});

watcher.on('change', (filePath) => {
  if (filePath.includes('session-notes')) {
    const sessions = parseSessionNotes();
    if (sessions.length > lastSessionCount) {
      const newEntries = sessions.slice(0, sessions.length - lastSessionCount);
      broadcast({ type: 'new_sessions', entries: newEntries, stats: getStats() });
      lastSessionCount = sessions.length;
    } else {
      broadcast({ type: 'stats_update', stats: getStats() });
    }
  }
  if (filePath.includes('status.json')) {
    const newStatus = JSON.stringify(getAgentStatus());
    if (newStatus !== lastStatus) {
      broadcast({ type: 'agent_update', agentStatus: getAgentStatus() });
      lastStatus = newStatus;
    }
  }
});

// Periodic stats broadcast every 30s
setInterval(() => {
  broadcast({ type: 'stats_update', stats: getStats() });
}, 30000);

// ─── START ────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Gary Command Center running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`📊 Watching: ${SESSION_NOTES_PATH}`);
});
