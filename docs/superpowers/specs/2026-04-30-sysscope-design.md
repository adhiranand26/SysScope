# SysScope — Design Spec

## Overview
A web-based real-time Linux system monitoring dashboard for a college OS course. Runs on Ubuntu VM (backend), accessed via browser on host Mac. Aesthetic: btop/htop-inspired — dense monospace layout, ASCII panel borders, #1a1a1a dark grey base, single amber (#e8a020) accent. Projector-ready with large readable numbers and smooth animations.

## Audience
- **Primary:** OS course professor evaluating OS internals knowledge
- **Secondary:** Classmates during presentation (non-Linux users)

## Target Platform
- **Backend:** Linux/Ubuntu VM, reads from `/proc`, `/sys`, uses `psutil`
- **Frontend:** Any modern browser on host Mac
- **Data transport:** WebSocket (real-time push)

## Tech Stack
- **Backend:** Python 3.11+, FastAPI, uvicorn, psutil, WebSocket
- **Frontend:** Vanilla HTML/CSS/JS (no framework), Canvas API for charts

## Design System
- **Background:** `#1a1a1a` (dark grey, NOT black)
- **Surface:** `#222222` (panel headers, status bars)
- **Border:** `#444444` (ASCII-style panel borders)
- **Text primary:** `#b0b0b0` (light grey)
- **Accent:** `#e8a020` (bold amber/orange — used for headers, highlights, active data)
- **State colors:** `#4ade80` (sleeping/ok), `#e8a020` (running/warning), `#ef4444` (zombie/critical)
- **Font:** `'JetBrains Mono', 'Courier New', monospace`
- **Panel headers:** ASCII style `┤ NAME ├`
- **Base font size:** 14px (projector-readable)
- **Key numbers:** 28-32px bold

## Core Features
1. **CPU Panel** — per-core bars + overall % + 60s sparkline history
2. **Memory Panel** — stacked bar (used/buf/cache/free), swap, page faults, dirty pages
3. **Process Table** — PID, PPID, state, %CPU, %MEM, threads, command
4. **System Info** — kernel, distro, uptime, load averages, hostname
5. **Disk I/O** — read/write speeds from `/proc/diskstats`, partition usage
6. **Performance Score** — 0-100 composite from CPU, RAM, swap, load

## Additional Features (build order)
1. **Process Control** — SIGTERM/SIGKILL buttons, renice slider, CPU hogs highlighted red
2. **Historical Graphs** — 60s rolling line charts (Canvas) for CPU and RAM
3. **Process State Insights** — live badges showing running/sleeping/zombie counts
4. **Alert & Threshold System** — CPU > 80%, RAM > 70% triggers, alert log panel
5. **Network Monitoring** — upload/download speed per interface + live graph
6. **Search & Filter** — filter process table by name, PID, or state
7. **Auto Refresh Control** — 1s/2s/5s toggle + pause button

## UX Features
- **H key help overlay** — explains all panels for non-Linux classmates
- **Keyboard shortcuts** — q quit, h help, t tree view, p pause
- **Smooth animations** — CSS transitions on bar updates, canvas chart animations
- **Color-coded process states** — visible from 3 meters on projector

## Data Pipeline
```
/proc/stat, /proc/meminfo, /proc/diskstats, /proc/net/dev
                    ↓
        psutil (Python wrapper)
                    ↓
        FastAPI collectors (1s interval)
                    ↓
        WebSocket broadcast (JSON)
                    ↓
        Browser JS → DOM updates + Canvas charts
```

## File Structure
```
os_project/
├── backend/
│   ├── main.py                 # FastAPI app + WebSocket endpoint
│   ├── collectors/
│   │   ├── __init__.py
│   │   ├── cpu.py              # CPU from /proc/stat via psutil
│   │   ├── memory.py           # RAM/swap from /proc/meminfo
│   │   ├── processes.py        # Process list + tree
│   │   ├── disk.py             # Disk I/O from /proc/diskstats
│   │   ├── system_info.py      # Kernel, uptime, load avg
│   │   ├── network.py          # Network bandwidth
│   │   └── score.py            # Performance score calculator
│   ├── controllers/
│   │   └── process_control.py  # Signal sending, renice
│   ├── alerts.py               # Threshold engine
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── dashboard.css       # btop-inspired design system
│   └── js/
│       ├── app.js              # WebSocket + main loop
│       ├── charts.js           # Canvas rolling chart library
│       ├── panels/
│       │   ├── cpu.js
│       │   ├── memory.js
│       │   ├── processes.js
│       │   ├── disk.js
│       │   ├── system.js
│       │   ├── network.js
│       │   └── alerts.js
│       ├── search.js           # Process filter
│       └── help.js             # H-key overlay
└── README.md
```
