# SysScope — Engineering Plan

## Part 3: Phase 2 — Frontend (HTML + CSS + JS Panels)

---

### Task 13: index.html — Dashboard Layout

**File:** `frontend/index.html`

Single-page layout using CSS Grid. All panels defined as semantic sections. Google Fonts loaded for JetBrains Mono.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SysScope — System Monitor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/dashboard.css">
</head>
<body>
    <!-- Top Status Bar -->
    <header id="topbar">
        <span class="logo">◉ SysScope</span>
        <span id="system-summary"></span>
        <span id="score-badge">▲ Score: --</span>
    </header>

    <!-- Main Dashboard Grid -->
    <main id="dashboard">
        <!-- Row 1: CPU + Memory -->
        <section id="panel-cpu" class="panel">
            <div class="panel-header">┤ CPU ├</div>
            <div class="panel-body" id="cpu-body"></div>
        </section>

        <section id="panel-memory" class="panel">
            <div class="panel-header">┤ MEMORY ├</div>
            <div class="panel-body" id="memory-body"></div>
        </section>

        <!-- Row 2: Process Table (full width) -->
        <section id="panel-processes" class="panel full-width">
            <div class="panel-header">
                <span>┤ PROCESSES ├</span>
                <span id="process-states"></span>
                <div id="process-search-container">
                    <input type="text" id="process-search" placeholder="Filter: name, PID, state..." />
                </div>
            </div>
            <div class="panel-body" id="processes-body"></div>
        </section>

        <!-- Row 3: Disk + Network -->
        <section id="panel-disk" class="panel">
            <div class="panel-header">┤ DISK I/O ├</div>
            <div class="panel-body" id="disk-body"></div>
        </section>

        <section id="panel-network" class="panel">
            <div class="panel-header">┤ NETWORK ├</div>
            <div class="panel-body" id="network-body"></div>
        </section>

        <!-- Row 4: System Info + Alerts -->
        <section id="panel-system" class="panel">
            <div class="panel-header">┤ SYSTEM ├</div>
            <div class="panel-body" id="system-body"></div>
        </section>

        <section id="panel-alerts" class="panel">
            <div class="panel-header">┤ ALERTS ├</div>
            <div class="panel-body" id="alerts-body"></div>
        </section>
    </main>

    <!-- Bottom Status Bar -->
    <footer id="bottombar">
        <span id="alert-summary"></span>
        <span id="controls">
            <button class="ctrl-btn active" data-interval="1">1s</button>
            <button class="ctrl-btn" data-interval="2">2s</button>
            <button class="ctrl-btn" data-interval="5">5s</button>
            <button class="ctrl-btn" id="btn-pause">⏸ Pause</button>
        </span>
        <span class="hint">[H] Help · [Q] Quit</span>
    </footer>

    <!-- Help Overlay (hidden by default) -->
    <div id="help-overlay" class="hidden">
        <div id="help-content"></div>
    </div>

    <!-- Process Control Modal (hidden by default) -->
    <div id="process-modal" class="hidden">
        <div id="modal-content"></div>
    </div>

    <!-- Scripts -->
    <script src="/static/js/charts.js"></script>
    <script src="/static/js/panels/cpu.js"></script>
    <script src="/static/js/panels/memory.js"></script>
    <script src="/static/js/panels/processes.js"></script>
    <script src="/static/js/panels/disk.js"></script>
    <script src="/static/js/panels/system.js"></script>
    <script src="/static/js/panels/network.js"></script>
    <script src="/static/js/panels/alerts.js"></script>
    <script src="/static/js/search.js"></script>
    <script src="/static/js/help.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>
```

---

### Task 14: dashboard.css — btop Design System

**File:** `frontend/css/dashboard.css`

Complete design system: CSS custom properties, grid layout, panel styles, bars, table styles, animations, status bar, help overlay.

Key design decisions:
- CSS Grid for dashboard: 2 columns, auto rows
- `.full-width` spans both columns (process table)
- Panel headers use amber accent with ASCII `┤ ├` decoration
- Progress bars use CSS transitions for smooth animation
- Process table rows have hover highlight
- State colors via CSS classes: `.state-running`, `.state-sleeping`, `.state-zombie`
- Font sizes: 14px base, 28px for key stats (projector-readable)
- Scrollable process table body (max-height with overflow)
- Help overlay: full-screen dark backdrop with centered content

CSS structure:
```
:root { /* all design tokens */ }
*, body { /* reset + base font */ }
#topbar, #bottombar { /* status bars */ }
#dashboard { /* CSS Grid: 2 columns */ }
.panel { /* border, radius, overflow */ }
.panel-header { /* amber accent, uppercase */ }
.panel-body { /* padding, content area */ }
.bar-container, .bar-fill { /* progress bars with transitions */ }
.stacked-bar { /* memory breakdown bar */ }
.stat-value { /* large 28px numbers */ }
.stat-label { /* dim 10px labels */ }
.table-header, .table-row { /* process table grid */ }
.state-running/sleeping/zombie/stopped { /* state colors */ }
.cpu-hog { /* red highlight for CPU > 50% */ }
.sparkline-canvas { /* chart container */ }
.ctrl-btn { /* refresh control buttons */ }
#help-overlay { /* fullscreen backdrop */ }
#process-modal { /* process control modal */ }
@keyframes fadeIn, pulse { /* animations */ }
```

---

### Task 15: app.js — WebSocket Client & State Manager

**File:** `frontend/js/app.js`

Responsibilities:
- Connect to `ws://HOST:8765/ws`
- Receive JSON metrics every 1s
- Dispatch data to each panel's `render()` function
- Handle reconnection with exponential backoff
- Send commands (kill, renice, set_interval, pause/resume)
- Keyboard shortcuts (H for help, Q to disconnect)
- Refresh control button handlers

Architecture:
```
WebSocket.onmessage(json)
    → data = JSON.parse
    → CpuPanel.render(data.cpu)
    → MemoryPanel.render(data.memory)
    → ProcessPanel.render(data.processes)
    → DiskPanel.render(data.disk)
    → SystemPanel.render(data.system)
    → NetworkPanel.render(data.network)
    → AlertPanel.render(data.alerts)
    → updateScore(data.score)
    → updateTopbar(data.system)
```

Key functions:
- `connect()` — WebSocket init with auto-reconnect
- `sendCommand(action, params)` — sends JSON to server
- `onMessage(event)` — parse + dispatch to panels
- `setupKeyboard()` — H key → help overlay, Q → disconnect
- `setupControls()` — 1s/2s/5s buttons + pause toggle

---

### Task 16: charts.js — Canvas Rolling Line Chart

**File:** `frontend/js/charts.js`

Reusable Canvas-based rolling chart class used by CPU, memory, and network panels.

API:
```javascript
class RollingChart {
    constructor(canvasElement, options = {})
    // options: { maxPoints: 60, lineColor: '#e8a020', fillColor: '#e8a02015',
    //            gridColor: '#333', min: 0, max: 100, lineWidth: 1.5 }
    
    push(value)      // Add new data point, remove oldest if > maxPoints
    render()         // Draw on canvas: grid lines, filled area, line, current value label
}
```

Features:
- Stores last 60 data points (60 seconds at 1s interval)
- Draws subtle horizontal grid lines at 25/50/75%
- Smooth line with anti-aliasing
- Semi-transparent fill under the line
- Current value label in top-right corner
- Auto-scales canvas to container width via ResizeObserver

---

### Task 17: CPU Panel Renderer

**File:** `frontend/js/panels/cpu.js`

Renders:
- Per-core horizontal progress bars with percentage labels
- Overall CPU % as large 28px stat
- 60s rolling sparkline chart (uses RollingChart)
- Frequency display (current/max MHz)

DOM structure it generates inside `#cpu-body`:
```
<div class="stat-row">
    <span class="stat-label">Overall</span>
    <span class="stat-value" id="cpu-overall">47.2%</span>
</div>
<div class="core-bars">
    <div class="core-bar-row">
        <span>Core 0</span>
        <div class="bar-container"><div class="bar-fill" style="width:62%"></div></div>
        <span>62%</span>
    </div>
    ... (repeat per core)
</div>
<canvas class="sparkline-canvas" id="cpu-chart"></canvas>
<div class="stat-row dim">
    <span>Freq: 2400 / 3600 MHz</span>
</div>
```

---

### Task 18: Memory Panel Renderer

**File:** `frontend/js/panels/memory.js`

Renders:
- Stacked horizontal bar: USED | BUFFERS | CACHED | FREE (btop style)
- Large stat: "3.2G / 8.0G"
- Swap bar with percentage
- Page fault counters (from /proc/vmstat): pgfault, pgmajfault, dirty pages
- 60s rolling chart for memory %

Utility function: `formatBytes(bytes)` → returns "3.2G", "412M", etc.

---

### Task 19: Process Table Renderer

**File:** `frontend/js/panels/processes.js`

Renders:
- Table header row: PID | PPID | USER | STATE | %CPU | %MEM | THR | COMMAND
- Scrollable table body (max 20 visible rows)
- Color-coded state column: green=sleeping, amber=running, red=zombie, yellow=stopped
- CPU hog highlighting: rows where CPU > 50% get red background tint
- Clickable rows → open process control modal (kill/renice)
- Sortable by clicking column headers (CPU desc default)

State badges in panel header: `2 running · 138 sleeping · 1 zombie`

Process control modal contents:
```
PID 1567 — python3 server.py
[SIGTERM]  [SIGKILL]
Nice: [-20 ←slider→ 19]  Current: 0
```

---

### Task 20: Disk Panel Renderer

**File:** `frontend/js/panels/disk.js`

Renders:
- Read speed bar + label (e.g., "45.2 MB/s")
- Write speed bar + label (e.g., "12.8 MB/s")
- Partition list: device, mount point, usage bar + percentage

---

### Task 21: System Info Panel Renderer

**File:** `frontend/js/panels/system.js`

Renders key-value grid:
```
Kernel    6.8.0-generic
Distro    Ubuntu 24.04 LTS
Hostname  adhiranand-vm
Uptime    4d 7h 23m 14s    (amber accent, updates live)
Load      1.24  0.98  0.76
Cores     4 logical / 2 physical
```

---

### Task 22: Network Panel Renderer

**File:** `frontend/js/panels/network.js`

Renders per interface (excluding loopback):
- Upload speed + download speed with formatted values
- Small rolling chart for combined bandwidth
- Total sent/received counters

---

### Task 23: Alert Panel Renderer

**File:** `frontend/js/panels/alerts.js`

Renders:
- Scrollable log of threshold alerts (newest first)
- Each alert: timestamp + type icon + message
- Color: amber for warnings, red for critical
- Alert count badge in bottom status bar

---

### Task 24: Search & Filter

**File:** `frontend/js/search.js`

- Listens to `#process-search` input events (debounced 200ms)
- Filters process table rows by: name (substring), PID (exact), state (exact)
- Hides non-matching rows via CSS class `.hidden`
- Shows match count: "Showing 12 of 142 processes"

---

### Task 25: Help Overlay

**File:** `frontend/js/help.js`

- Toggles `#help-overlay` visibility on H key press
- Content: panel-by-panel explanation for non-Linux users
- Keyboard shortcut reference table
- Dismisses on Escape key or clicking backdrop

Help content covers:
- What CPU % means and what per-core shows
- RAM breakdown: used vs buffers vs cached (and why cached isn't wasted)
- Process states: what running/sleeping/zombie/stopped mean
- What load average numbers mean
- What page faults are and why they matter
- How the performance score is calculated

---

### Implementation Order Within Part 3

| Step | Files | Depends On |
|------|-------|-----------|
| 1 | `dashboard.css` | Nothing — pure design tokens |
| 2 | `index.html` | CSS must exist |
| 3 | `charts.js` | Nothing — standalone class |
| 4 | `app.js` | All panel scripts must be loaded first |
| 5 | `panels/system.js` | Simplest panel — start here |
| 6 | `panels/cpu.js` | Needs charts.js |
| 7 | `panels/memory.js` | Needs charts.js |
| 8 | `panels/processes.js` | Most complex — do after simpler panels |
| 9 | `panels/disk.js` | Simple bars |
| 10 | `panels/network.js` | Needs charts.js |
| 11 | `panels/alerts.js` | Simple list |
| 12 | `search.js` | Needs processes panel DOM |
| 13 | `help.js` | Last — standalone overlay |

---

**Part 3 complete.** Say **"continue"** for Part 4 (Phase 3–10: Process control, historical graphs, alerts, network, refresh controls, polish — all remaining features).
