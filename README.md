<div align="center">

```text
  ____            ____                      
 / ___| _   _ ___/ ___|  ___ ___  _ __   ___ 
 \___ \| | | / __\___ \ / __/ _ \| '_ \ / _ \
  ___) | |_| \__ \___) | (_| (_) | |_) |  __/
 |____/ \__, |___/____/ \___\___/| .__/ \___|
        |___/                    |_|         
```

**Real-time, cross-platform system telemetry and visualization.**

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-Enabled-F28D1A?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Status: Active](https://img.shields.io/badge/Status-Active-success.svg?style=flat-square)](#)

</div>

<br>

## 🚀 The Hook

**Your entire system's pulse, rendered at 60 frames per second.**

SysScope bridges the gap between low-level kernel telemetry and high-end visual design. By tapping directly into the OS pseudo-filesystems and routing metrics through a hyper-fast WebSocket pipeline, SysScope delivers an uncompromising, glassmorphic HUD for monitoring and managing your operating system in real time.

---

## ✨ Features

| 🛠️ System Internals | 🎨 Interface & UX |
| :--- | :--- |
| **🧠 Per-Core CPU:** Granular threading loads & frequencies | **🖥️ Dynamic Layout:** Tiling grid & maximized full-screen views |
| **🐏 Memory Internals:** Buffer/Cache split & Page Faults | **✨ Glassmorphism:** Real-time blurred panels & variable opacity |
| **⚙️ Process Control:** Send `SIGTERM`/`SIGKILL` & `renice` | **🎨 Live Theming:** Instant Accent/Base color and preset swapping |
| **💾 Disk I/O:** Moving throughput bars & mount utilization | **📈 Rolling Charts:** 60-second high-fidelity canvas sparklines |
| **🌐 Network Mapping:** Per-process bandwidth hogs | **🔔 Web Audio Alerts:** Synthesized sonic alerts on threshold breach |
| **🎮 Hardware Ops:** GPU utilization & Battery health | **🖱️ Hover Tooltips:** Contextual data popups exactly when needed |

---

## 📸 Screenshots

<div align="center">

> 🖼️ *[PLACEHOLDER: Add `/assets/dashboard-overview.png` here]*  
> **Dashboard Overview:** The massive telemetry grid tracking active system states.

<br>

> 🖼️ *[PLACEHOLDER: Add `/assets/process-control.png` here]*  
> **Process Control:** Modifying process priorities (`renice`) and states via the UI modal.

<br>

> 🖼️ *[PLACEHOLDER: Add `/assets/theme-customizer.png` here]*  
> **Theme Customizer:** The slide-out tray for modifying CSS variables dynamically.

</div>

---

## 🏗️ Architecture Pipeline

SysScope operates via a tight, unidirectional data flow, minimizing CPU overhead while maximizing DOM update speeds.

```text
[ Linux Kernel / macOS XNU ]
          │
          ▼
[ /proc & /sys virtual files ] ──────┐ (Fallback)
          │                          │
          ▼                          ▼
[ psutil & Subprocess Probes ] ◄───[ Custom Python Collectors ]
          │
          ▼
[ FastAPI Async Server ] ──( JSON Payload )──► [ WebSocket Broadcast Loop ]
                                                        │
                                                        ▼
[ Browser DOM ] ◄──( RequestAnimationFrame )─── [ Vanilla JS Dispatcher ]
```

### 📂 Kernel Path Mappings
When running on Linux, SysScope directly interfaces with these virtual kernel endpoints:

| Virtual Path | Data Extracted | Module |
| :--- | :--- | :--- |
| `/proc/stat` | CPU times, context switches, boot time | `cpu.py` |
| `/proc/meminfo` | Hardware RAM, swap, buffers, dirty pages | `memory.py` |
| `/proc/vmstat` | Global page faults (`pgfault`, `pgmajfault`) | `memory.py` |
| `/proc/[pid]/stat` | Process state (R, S, Z), threads, nice val | `processes.py` |
| `/proc/net/dev` | Global network interface bandwidth limits | `network.py` |
| `/sys/class/thermal/*`| CPU/GPU core temperatures | `system_info.py` |
| `/sys/class/power_supply/*`| Raw battery capacity, cycles, design limits | `battery.py` |

---

## ⚡ Quick Start

Boot up the entire stack in under 60 seconds. 

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/sysscope.git
cd sysscope/backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Boot the FastAPI server
python main.py
```

**Next:** Open your browser and navigate to 👉 `http://localhost:8765`

---

## 🎓 OS Concepts Demonstrated

<details>
<summary><strong>Click to expand internal Operating System theory mechanics</strong></summary>

<br>

SysScope is built not just as a tool, but as a practical demonstration of core OS concepts:

- **The Virtual Filesystem (`/proc` & `/sys`)**: Demonstrates how Unix-like systems expose active kernel data structures as readable text files, allowing user-space programs to peek at hardware states without writing C-level system calls.
- **Process State Machine**: Visualizes the lifecycle of programs, distinguishing between `Running` (R), `Sleeping` (S), `Disk Sleep` (D), and `Zombie` (Z) states by reading the kernel's process scheduler data.
- **Virtual Memory & Page Faults**: Demystifies how the OS fakes "infinite" memory. The memory panel exposes the exact rate at which the CPU triggers Major Page Faults (fetching data from disk to RAM) versus Minor Page Faults (re-mapping existing pages).
- **Scheduling & Priority (`nice`)**: Provides a physical UI to alter a process's `nice` value from `-20` to `19`, visually proving how the OS scheduler re-allocates CPU time slices based on priority weightings.
- **Load Averages**: Explains the classic 1m/5m/15m load metrics—showing the raw length of the kernel's run queue (processes waiting for CPU time).

</details>

---

## ⌨️ Keyboard Shortcuts

Power users can navigate SysScope entirely without a mouse.

| Key / Action | Result |
| :--- | :--- |
| <kbd>H</kbd> | Toggle the Help overlay menu |
| <kbd>P</kbd> | Pause / Resume real-time data streaming |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>5</kbd> | Set WebSocket refresh interval (seconds) |
| <kbd>Esc</kbd> | Close active modals or help screens |
| `Double Click` | Maximize specific panel to fill the entire screen |

---

## 🧰 Tech Stack

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | `3.11+` | Core backend language |
| **FastAPI** | `0.109+`| Async web framework handling the HTTP and WS endpoints |
| **psutil** | `5.9+` | Cross-platform abstraction layer for system monitoring |
| **Vanilla JS** | `ES6` | Dependency-free frontend architecture |
| **HTML5 Canvas** | `N/A` | Hardware-accelerated rendering for the 60fps rolling sparklines |
| **Vanilla CSS** | `3` | Layout logic via CSS Grid, Flexbox, and CSS Variables |

---

## ⚙️ Configuration

SysScope ships with sane defaults, but threshold limits can be manually tweaked inside `backend/alerts.py`. When a metric crosses these barriers, an event is piped to the UI and triggers the Web Audio API.

```python
# backend/alerts.py
THRESHOLDS = {
    "cpu": 80.0,                   # CPU percentage
    "ram": 70.0,                   # Memory percentage
    "swap": 50.0,                  # Swap partition usage
    "disk": 85.0,                  # Disk space utilization
    "gpu_temp": 80.0,              # Degrees Celsius
    "battery": 15.0,               # Low battery warning
    "network": 100 * 1024 * 1024,  # Network spike (100 MB/s)
}
```

---

## ⚠️ Known Limitations

While SysScope is designed to be cross-platform, operating systems handle hardware differently:
- **macOS GPU Metrics**: Apple Silicon obscures raw GPU utilization metrics. SysScope extracts what it can via `system_profiler` and `ioreg`, but VRAM readouts may estimate dynamically allocated memory.
- **Linux `/proc` Fallbacks**: True per-process network bandwidth requires `root` access and packet sniffing (e.g., `libpcap`) or eBPF. SysScope gracefully degrades to estimating high-traffic connections.
- **Battery Requirements**: Desktop machines (e.g., Mac Studio, Linux Towers) will safely disable the battery UI entirely when physical power cells are not detected.

---

## 🤝 Contributing & License

We accept Pull Requests! If you want to build a new collector module, ensure it falls back gracefully when cross-platform endpoints aren't available.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**License:** This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<br>

<div align="center">
  <i>Monitor deeply. Execute sharply.</i>
</div>
