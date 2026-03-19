# PRD — Gary Command Center

## Vision
Ein real-time Dashboard das Gary's gesamtes AI-Ökosystem visualisiert — live Agent-Status, Aktivitäts-Feed, Projekt-Tracking, Performance-Stats und interaktive Session-Timeline. Das Beste aus Mission Control, Bloomberg Terminal und einem modernen Dev-Dashboard.

## Problem
Aktuell sieht Michael Gary's Aktivitäten nur passiv über Telegram-Nachrichten. Es gibt keine Übersicht über:
- Welche Agents gerade aktiv sind / was sie tun
- Wie viele Tasks heute erledigt wurden
- Was in den Session Notes steht
- Wie Gary's Produktivität sich über Zeit entwickelt

## Ziel
Eine beautiful, real-time Web-App die auf dem VPS läuft und über den Browser erreichbar ist.

---

## EPICs

### EPIC 1: Core Infrastructure (Backend)
- Express.js API Server auf Port 3002
- WebSocket-Server für Real-Time Updates
- Daten-Layer: liest Session Notes, Status JSONs, GitHub Issues
- REST Endpoints: /api/status, /api/agents, /api/sessions, /api/stats

### EPIC 2: Real-Time Agent Activity Feed
- Live-Feed aller Agent-Aktivitäten (wie ein Terminal)
- WebSocket push von neuen Session-Notes
- Status-Icons: aktiv / idle / abgeschlossen
- Timestamps und Agent-Namen

### EPIC 3: Stats & Analytics Dashboard
- Kacheln: Tasks heute, aktive Projekte, offene GitHub Issues, Uptime
- Activity Chart: Aktivitäten pro Tag (letzte 14 Tage)
- Projekt-Übersicht mit Issue-Counts
- Streak-Anzeige: Wie viele Tage in Folge aktiv?

### EPIC 4: Interactive Timeline (Session Notes)
- Chronologische Timeline aller Session-Aktivitäten
- Filter nach Datum / Projekt
- Search-Funktion
- Collapsible Entries

### EPIC 5: Design & UI Polish
- Dark Glassmorphism Design (Premium Look)
- Animated Background (Partikel oder Matrix-Regen)
- Smooth Animationen / Transitions
- Fully Responsive (Mobile + Desktop)
- Easter Egg: Konami Code → Gary spricht 😄

---

## Tech Stack
- **Backend:** Node.js + Express + ws (WebSocket)
- **Frontend:** Vanilla JS + CSS (kein Framework, maximale Performance)
- **Charts:** Chart.js
- **Animations:** CSS + Canvas API
- **Hosting:** VPS nginx Reverse Proxy auf Port 3002
- **Data Sources:** /root/share/05-system/session-notes.md, GitHub API, /root/share/workflow/status.json

---

## Success Criteria
- [ ] Dashboard lädt in < 2s
- [ ] Real-time Updates ohne Page Reload
- [ ] Alle 5 EPICs implementiert
- [ ] Sieht so gut aus dass man es als Portfolio-Stück zeigen kann
- [ ] Läuft stable 24/7 auf VPS
