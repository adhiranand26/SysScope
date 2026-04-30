# SysScope — Engineering Plan

## Part 1: Project Structure, Tech Stack & Architecture

---

### 1.1 Project Overview

**SysScope** is a web-based real-time Linux system monitoring dashboard built for a college OS course. It visualizes OS internals (CPU, memory, processes, disk I/O) with a btop/htop-inspired aesthetic rendered in the browser.

- **Backend** runs on Ubuntu VM, collects metrics from `/proc`, `/sys` via `psutil`
- **Frontend** accessed via browser on host Mac over the VM's network
- **Data transport** via WebSocket for real-time push (no polling)

---

### 1.2 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend runtime** | Python 3.11+ | psutil is Python-native, fast prototyping |
| **Web framework** | FastAPI | Async-native, built-in WebSocket support, minimal boilerplate |
| **ASGI server** | uvicorn | Production-grade async server for FastAPI |
| **OS data collection** | psutil | Cross-platform wrapper over `/proc`, `/sys` — handles edge cases |
| **Data transport** | WebSocket | Real-time bidirectional — server pushes every 1s, client sends commands (kill, renice) |
| **Frontend** | Vanilla HTML + CSS + JS | No framework overhead, full control over btop aesthetic, zero build step |
| **Charts** | Canvas API (hand-rolled) | Lightweight rolling line charts, no chart library bloat |
| **Font** | JetBrains Mono (Google Fonts) | Monospace, ligature support, projector-readable |

---

### 1.3 Folder Structure

```
os_project/
├── backend/
│   ├── main.py                    # FastAPI app, WebSocket endpoint, broadcast loop
│   ├── requirements.txt           # Python dependencies
│   ├── collectors/
│   │   ├── __init__.py
│   │   ├── cpu.py                 # Per-core %, frequency, overall utilization
│   │   ├── memory.py              # RAM used/free/buffers/cached, swap, page faults
│   │   ├── processes.py           # Process list with PID/PPID/state/CPU/MEM/threads
│   │   ├── disk.py                # Read/write speed from /proc/diskstats, partition usage
│   │   ├── system_info.py         # Kernel version, hostname, uptime, load averages
│   │   ├── network.py             # Per-interface upload/download bytes → speed
│   │   └── score.py               # Composite 0-100 performance score
│   ├── controllers/
│   │   └── process_control.py     # SIGTERM/SIGKILL sender, renice via os.setpriority()
│   └── alerts.py                  # Threshold engine — CPU > 80%, RAM > 70%, alert log
│
├── frontend/
│   ├── index.html                 # Single page — all panels laid out in grid
│   ├── css/
│   │   └── dashboard.css          # Complete btop design system (colors, panels, grid)
│   └── js/
│       ├── app.js                 # WebSocket connection, main render loop, state manager
│       ├── charts.js              # Canvas-based rolling line chart (reusable)
│       ├── panels/
│       │   ├── cpu.js             # CPU panel — core bars + sparkline
│       │   ├── memory.js          # Memory panel — stacked bar + stats
│       │   ├── processes.js       # Process table — sortable, clickable rows
│       │   ├── disk.js            # Disk I/O panel — read/write bars
│       │   ├── system.js          # System info panel — key/value grid
│       │   ├── network.js         # Network panel — speed + chart
│       │   └── alerts.js          # Alert panel — threshold warnings log
│       ├── search.js              # Process table filter (name, PID, state)
│       └── help.js                # H-key overlay with panel explanations
│
└── README.md                      # Setup instructions, screenshots, architecture diagram
```

---

### 1.4 Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LINUX KERNEL                              │
│  /proc/stat  /proc/meminfo  /proc/vmstat  /proc/diskstats   │
│  /proc/net/dev  /proc/[pid]/stat  /sys/...                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ read by
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  PSUTIL (Python)                             │
│  cpu_percent()  virtual_memory()  process_iter()            │
│  disk_io_counters()  net_io_counters()  boot_time()         │
└──────────────────────┬──────────────────────────────────────┘
                       │ called by
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              COLLECTORS (backend/collectors/)                │
│  Each collector returns a dict. All merged in collect_all()  │
│  Score calculator combines CPU + MEM + SWAP + LOAD → 0-100  │
│  Alert engine checks thresholds, appends to alert log       │
└──────────────────────┬──────────────────────────────────────┘
                       │ every 1 second
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           FASTAPI WEBSOCKET BROADCAST                       │
│  asyncio task runs collect_all() → JSON → send to all       │
│  connected clients. Also receives commands (kill, renice)   │
│  via incoming WebSocket messages.                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (ws://vm-ip:8765/ws)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                BROWSER (Frontend)                           │
│  app.js connects WebSocket, receives JSON every 1s          │
│  Dispatches data to panel modules → DOM updates             │
│  charts.js draws rolling Canvas charts (CPU, RAM, network)  │
│  Process control sends commands back via WebSocket           │
└─────────────────────────────────────────────────────────────┘
```

**Server → Client payload shape:**
```
{
  cpu:        { overall, per_core[], core_count, freq }
  memory:     { total, used, buffers, cached, swap_*, page_faults, major_faults }
  processes:  { list[], total, states: { running, sleeping, zombie, stopped } }
  disk:       { read_speed, write_speed, partitions[] }
  system:     { kernel, hostname, distro, uptime, load_1/5/15 }
  network:    { interfaces[]: { name, bytes_sent, bytes_recv, speed_up, speed_down } }
  score:      0-100 integer
  alerts:     [ { type, message, timestamp } ]
  timestamp:  unix float
}
```

**Client → Server commands:**
```
{ action: "kill",         pid, signal: "SIGTERM"|"SIGKILL" }
{ action: "renice",       pid, nice: -20..19 }
{ action: "set_interval", seconds: 1|2|5 }
{ action: "pause" }
{ action: "resume" }
```

---

### 1.5 Design System Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#1a1a1a` | Page background |
| `--bg-surface` | `#222222` | Panel headers, status bars |
| `--bg-elevated` | `#252525` | Table header rows |
| `--border` | `#444444` | Panel borders |
| `--text-primary` | `#b0b0b0` | Default text |
| `--text-dim` | `#777777` | Labels, secondary info |
| `--accent` | `#e8a020` | Headers, active data, highlights |
| `--state-running` | `#e8a020` | Running processes |
| `--state-sleeping` | `#4ade80` | Sleeping processes |
| `--state-zombie` | `#ef4444` | Zombie/critical |
| `--state-stopped` | `#fbbf24` | Stopped processes |
| `--font` | `'JetBrains Mono', monospace` | All text |
| `--font-size-base` | `14px` | Body text (projector-ready) |
| `--font-size-stat` | `28px` | Key metric numbers |
| `--panel-radius` | `2px` | Subtle corners |
| `--panel-header` | ASCII `┤ NAME ├` | Panel title format |

---

### 1.6 Implementation Phases

| Phase | Name | Scope |
|-------|------|-------|
| **1** | Foundation | Backend skeleton, WebSocket pipeline, all collectors |
| **2** | Core Dashboard | Frontend shell, CSS design system, all 6 core panels rendering live |
| **3** | Process Control | SIGTERM/SIGKILL, renice slider, CPU hog red highlight |
| **4** | Historical Graphs | 60s rolling Canvas line charts for CPU + RAM |
| **5** | Process State Insights | Live state badges (running/sleeping/zombie) with colors |
| **6** | Alerts & Thresholds | CPU > 80%, RAM > 70% detection, alert log panel |
| **7** | Network Monitoring | Upload/download speed per interface + live graph |
| **8** | Search & Filter | Process table filter by name, PID, state |
| **9** | Refresh Control | 1s/2s/5s toggle + pause/resume button |
| **10** | Polish | H-key help overlay, keyboard shortcuts, animations, README |

---

**Part 1 complete.** Say **"continue"** for Part 2 (Phase 1–2 detailed breakdown: backend collectors + frontend core panels).
