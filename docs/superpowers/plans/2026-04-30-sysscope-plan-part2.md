# SysScope — Engineering Plan

## Part 2: Phase 1 — Backend Implementation (All Collectors + WebSocket)

---

### Task 1: Project Setup

**Files:** `backend/requirements.txt`

```txt
fastapi==0.111.0
uvicorn[standard]==0.30.1
psutil==5.9.8
```

**Setup command:**
```bash
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

---

### Task 2: CPU Collector

**File:** `backend/collectors/cpu.py`

**What it reads:** `/proc/stat` (via psutil.cpu_percent), `/proc/cpuinfo` (via psutil.cpu_freq)

**Returns:** Overall %, per-core %, core count, current/max frequency

```python
import psutil


def collect_cpu() -> dict:
    """Collect CPU utilization metrics.
    
    Reads /proc/stat for per-core and overall CPU percentages.
    Reads /proc/cpuinfo for frequency data.
    """
    per_core = psutil.cpu_percent(percpu=True)
    overall = psutil.cpu_percent()
    freq = psutil.cpu_freq()

    return {
        "overall": overall,
        "per_core": per_core,
        "core_count": psutil.cpu_count(logical=True),
        "physical_cores": psutil.cpu_count(logical=False),
        "freq_current": round(freq.current, 0) if freq else 0,
        "freq_max": round(freq.max, 0) if freq else 0,
    }
```

---

### Task 3: Memory Collector

**File:** `backend/collectors/memory.py`

**What it reads:** `/proc/meminfo` (via psutil.virtual_memory), `/proc/vmstat` (direct read for page faults)

**Returns:** RAM breakdown (used/free/buffers/cached), swap, page fault counters

```python
import psutil


def collect_memory() -> dict:
    """Collect memory metrics from /proc/meminfo and /proc/vmstat.
    
    Provides full RAM breakdown (used, available, buffers, cached),
    swap usage, and page fault counters for OS internals demonstration.
    """
    vm = psutil.virtual_memory()
    sw = psutil.swap_memory()

    data = {
        "total": vm.total,
        "used": vm.used,
        "available": vm.available,
        "buffers": getattr(vm, "buffers", 0),
        "cached": getattr(vm, "cached", 0),
        "percent": vm.percent,
        "swap_total": sw.total,
        "swap_used": sw.used,
        "swap_percent": sw.percent,
        "page_faults": 0,
        "major_faults": 0,
        "dirty_pages_bytes": 0,
    }

    # Read /proc/vmstat directly for page fault details
    # psutil doesn't expose these — shows OS internals knowledge
    try:
        with open("/proc/vmstat", "r") as f:
            for line in f:
                parts = line.split()
                if len(parts) == 2:
                    key, val = parts[0], int(parts[1])
                    if key == "pgfault":
                        data["page_faults"] = val
                    elif key == "pgmajfault":
                        data["major_faults"] = val
                    elif key == "nr_dirty":
                        data["dirty_pages_bytes"] = val * 4096  # pages to bytes
    except (FileNotFoundError, PermissionError):
        pass

    return data
```

---

### Task 4: Process Collector

**File:** `backend/collectors/processes.py`

**What it reads:** `/proc/[pid]/stat`, `/proc/[pid]/status` (via psutil.process_iter)

**Returns:** Top 100 processes sorted by CPU, state counts, process tree info (PPID for fork relationships)

```python
import psutil

# Map psutil status constants to readable strings
STATE_MAP = {
    psutil.STATUS_RUNNING: "running",
    psutil.STATUS_SLEEPING: "sleeping",
    psutil.STATUS_DISK_SLEEP: "disk_sleep",
    psutil.STATUS_STOPPED: "stopped",
    psutil.STATUS_ZOMBIE: "zombie",
    psutil.STATUS_DEAD: "dead",
    psutil.STATUS_IDLE: "idle",
}

ATTRS = [
    "pid", "ppid", "name", "status", "cpu_percent",
    "memory_percent", "num_threads", "cmdline", "username", "nice",
]


def collect_processes() -> dict:
    """Collect process list from /proc/[pid]/ entries.
    
    Each process includes PID, PPID (for fork tree), state,
    CPU/MEM usage, thread count, nice value, and command.
    Returns top 100 by CPU usage + state counts.
    """
    procs = []
    state_counts = {
        "running": 0, "sleeping": 0, "zombie": 0,
        "stopped": 0, "disk_sleep": 0, "other": 0,
    }

    for p in psutil.process_iter(ATTRS):
        try:
            info = p.info
            state = STATE_MAP.get(info["status"], "other")
            if state in state_counts:
                state_counts[state] += 1
            else:
                state_counts["other"] += 1

            cmdline = info.get("cmdline")
            cmd = " ".join(cmdline[:4]) if cmdline else (info["name"] or "")

            procs.append({
                "pid": info["pid"],
                "ppid": info["ppid"] or 0,
                "name": info["name"] or "",
                "state": state,
                "cpu": round(info["cpu_percent"] or 0, 1),
                "mem": round(info["memory_percent"] or 0, 1),
                "threads": info["num_threads"] or 0,
                "nice": info["nice"] if info["nice"] is not None else 0,
                "cmd": cmd,
                "user": info["username"] or "",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Sort by CPU descending — top hogs first
    procs.sort(key=lambda x: x["cpu"], reverse=True)

    return {
        "list": procs[:100],
        "total": len(procs),
        "states": state_counts,
    }
```

---

### Task 5: Disk Collector

**File:** `backend/collectors/disk.py`

**What it reads:** `/proc/diskstats` (via psutil.disk_io_counters), `/proc/mounts` (via psutil.disk_partitions)

**Returns:** Read/write speed (bytes/sec delta), partition usage

```python
import psutil

# Store previous counters to calculate speed delta
_prev_counters = None
_prev_read = 0
_prev_write = 0


def collect_disk() -> dict:
    """Collect disk I/O metrics from /proc/diskstats.
    
    Calculates read/write speed as delta between consecutive calls.
    Also reads partition usage from /proc/mounts + statvfs.
    """
    global _prev_counters, _prev_read, _prev_write

    counters = psutil.disk_io_counters()
    read_speed = 0
    write_speed = 0

    if _prev_counters is not None and counters is not None:
        read_speed = max(0, counters.read_bytes - _prev_read)
        write_speed = max(0, counters.write_bytes - _prev_write)

    if counters:
        _prev_read = counters.read_bytes
        _prev_write = counters.write_bytes
    _prev_counters = counters

    # Partition usage
    partitions = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            partitions.append({
                "device": part.device,
                "mount": part.mountpoint,
                "fstype": part.fstype,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent,
            })
        except (PermissionError, OSError):
            continue

    return {
        "read_speed": read_speed,
        "write_speed": write_speed,
        "read_total": counters.read_bytes if counters else 0,
        "write_total": counters.write_bytes if counters else 0,
        "partitions": partitions,
    }
```

---

### Task 6: System Info Collector

**File:** `backend/collectors/system_info.py`

**What it reads:** `uname` syscall (via platform), `/proc/uptime` (via psutil.boot_time), `/proc/loadavg` (via os.getloadavg)

**Returns:** Kernel, distro, hostname, formatted uptime, load averages

```python
import platform
import time
import psutil

_boot_time = psutil.boot_time()


def collect_system_info() -> dict:
    """Collect system identification and health metrics.
    
    Reads kernel version from uname, uptime from /proc/uptime,
    and load averages from /proc/loadavg.
    """
    uname = platform.uname()
    load = psutil.getloadavg()
    uptime_secs = time.time() - _boot_time

    days = int(uptime_secs // 86400)
    hours = int((uptime_secs % 86400) // 3600)
    mins = int((uptime_secs % 3600) // 60)
    secs = int(uptime_secs % 60)

    # Try to get distro info from /etc/os-release
    distro = f"{uname.system}"
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    distro = line.split("=", 1)[1].strip().strip('"')
                    break
    except FileNotFoundError:
        pass

    return {
        "kernel": uname.release,
        "hostname": uname.node,
        "distro": distro,
        "arch": uname.machine,
        "uptime_formatted": f"{days}d {hours}h {mins}m {secs}s",
        "uptime_seconds": int(uptime_secs),
        "load_1": round(load[0], 2),
        "load_5": round(load[1], 2),
        "load_15": round(load[2], 2),
        "cpu_count": psutil.cpu_count(logical=True),
        "boot_time": _boot_time,
    }
```

---

### Task 7: Network Collector

**File:** `backend/collectors/network.py`

**What it reads:** `/proc/net/dev` (via psutil.net_io_counters)

**Returns:** Per-interface upload/download speed (bytes/sec delta)

```python
import psutil

_prev_counters: dict = {}


def collect_network() -> dict:
    """Collect network I/O from /proc/net/dev.
    
    Calculates per-interface upload/download speed as delta
    between consecutive calls (bytes per second).
    """
    global _prev_counters

    current = psutil.net_io_counters(pernic=True)
    interfaces = []

    for name, counters in current.items():
        if name == "lo":
            continue  # skip loopback

        speed_up = 0
        speed_down = 0

        if name in _prev_counters:
            prev = _prev_counters[name]
            speed_up = max(0, counters.bytes_sent - prev.bytes_sent)
            speed_down = max(0, counters.bytes_recv - prev.bytes_recv)

        interfaces.append({
            "name": name,
            "speed_up": speed_up,
            "speed_down": speed_down,
            "total_sent": counters.bytes_sent,
            "total_recv": counters.bytes_recv,
            "packets_sent": counters.packets_sent,
            "packets_recv": counters.packets_recv,
        })

    _prev_counters = current
    return {"interfaces": interfaces}
```

---

### Task 8: Performance Score Calculator

**File:** `backend/collectors/score.py`

**What it computes:** Weighted composite of CPU, memory, swap, and load average

**Returns:** Single integer 0–100 (higher = healthier system)

```python
import psutil


def calc_score() -> int:
    """Calculate system performance score (0-100).
    
    Weighted formula:
    - CPU usage:    35% weight (lower CPU = higher score)
    - Memory usage: 30% weight (lower MEM = higher score)
    - Swap usage:   15% weight (any swap = penalty, doubled)
    - Load average: 20% weight (load/cores ratio)
    
    Demonstrates understanding of system health metrics.
    """
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory().percent
    swap = psutil.swap_memory().percent
    cores = max(psutil.cpu_count(), 1)
    load_ratio = min(100, (psutil.getloadavg()[0] / cores) * 100)

    cpu_score = max(0, 100 - cpu)
    mem_score = max(0, 100 - mem)
    swap_score = max(0, 100 - swap * 2)  # swap penalized 2x
    load_score = max(0, 100 - load_ratio)

    total = int(
        cpu_score * 0.35
        + mem_score * 0.30
        + swap_score * 0.15
        + load_score * 0.20
    )
    return max(0, min(100, total))
```

---

### Task 9: Alert Threshold Engine

**File:** `backend/alerts.py`

**Purpose:** Checks metrics against thresholds, maintains rolling alert log (last 50)

```python
import time

# Configurable thresholds
THRESHOLDS = {
    "cpu": 80.0,     # CPU > 80% triggers warning
    "memory": 70.0,  # RAM > 70% triggers warning
    "swap": 50.0,    # Swap > 50% triggers warning
}

# Rolling log of recent alerts (max 50)
_alert_log: list[dict] = []
MAX_ALERTS = 50

# Cooldown: don't re-alert same type within 10 seconds
_last_alert_time: dict[str, float] = {}
COOLDOWN = 10.0


def check_alerts(metrics: dict) -> list[dict]:
    """Check current metrics against thresholds.
    
    Returns list of active alerts. Maintains a rolling log
    with cooldown to avoid spam.
    """
    now = time.time()
    new_alerts = []

    # CPU check
    cpu_val = metrics.get("cpu", {}).get("overall", 0)
    if cpu_val > THRESHOLDS["cpu"]:
        if now - _last_alert_time.get("cpu", 0) > COOLDOWN:
            alert = {
                "type": "cpu",
                "level": "warning",
                "message": f"CPU usage at {cpu_val}% (threshold: {THRESHOLDS['cpu']}%)",
                "value": cpu_val,
                "timestamp": now,
            }
            new_alerts.append(alert)
            _last_alert_time["cpu"] = now

    # Memory check
    mem_val = metrics.get("memory", {}).get("percent", 0)
    if mem_val > THRESHOLDS["memory"]:
        if now - _last_alert_time.get("memory", 0) > COOLDOWN:
            alert = {
                "type": "memory",
                "level": "warning",
                "message": f"RAM usage at {mem_val}% (threshold: {THRESHOLDS['memory']}%)",
                "value": mem_val,
                "timestamp": now,
            }
            new_alerts.append(alert)
            _last_alert_time["memory"] = now

    # Swap check
    swap_val = metrics.get("memory", {}).get("swap_percent", 0)
    if swap_val > THRESHOLDS["swap"]:
        if now - _last_alert_time.get("swap", 0) > COOLDOWN:
            alert = {
                "type": "swap",
                "level": "critical",
                "message": f"Swap usage at {swap_val}% (threshold: {THRESHOLDS['swap']}%)",
                "value": swap_val,
                "timestamp": now,
            }
            new_alerts.append(alert)
            _last_alert_time["swap"] = now

    # Add new alerts to log
    _alert_log.extend(new_alerts)
    while len(_alert_log) > MAX_ALERTS:
        _alert_log.pop(0)

    return list(_alert_log)


def get_alert_log() -> list[dict]:
    return list(_alert_log)
```

---

### Task 10: Process Controller

**File:** `backend/controllers/process_control.py`

**Purpose:** Handles kill signals and renice commands received via WebSocket

```python
import os
import signal
import psutil


def kill_process(pid: int, sig: str = "SIGTERM") -> dict:
    """Send signal to a process.
    
    Supports SIGTERM (graceful) and SIGKILL (force).
    Returns success/failure status.
    """
    sig_map = {
        "SIGTERM": signal.SIGTERM,
        "SIGKILL": signal.SIGKILL,
    }

    if sig not in sig_map:
        return {"success": False, "error": f"Unknown signal: {sig}"}

    try:
        proc = psutil.Process(pid)
        proc_name = proc.name()
        os.kill(pid, sig_map[sig])
        return {
            "success": True,
            "message": f"Sent {sig} to PID {pid} ({proc_name})",
        }
    except psutil.NoSuchProcess:
        return {"success": False, "error": f"PID {pid} not found"}
    except psutil.AccessDenied:
        return {"success": False, "error": f"Permission denied for PID {pid}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def renice_process(pid: int, nice_value: int) -> dict:
    """Change process priority (nice value).
    
    Nice range: -20 (highest priority) to 19 (lowest).
    Requires root for negative nice values.
    """
    nice_value = max(-20, min(19, nice_value))

    try:
        proc = psutil.Process(pid)
        proc_name = proc.name()
        proc.nice(nice_value)
        return {
            "success": True,
            "message": f"Set PID {pid} ({proc_name}) nice to {nice_value}",
        }
    except psutil.NoSuchProcess:
        return {"success": False, "error": f"PID {pid} not found"}
    except psutil.AccessDenied:
        return {"success": False, "error": f"Permission denied (need root for nice < 0)"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

### Task 11: Main Application (FastAPI + WebSocket)

**File:** `backend/main.py`

**Purpose:** FastAPI app that serves the frontend, broadcasts metrics via WebSocket, and handles incoming commands

```python
import asyncio
import json
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from collectors.cpu import collect_cpu
from collectors.memory import collect_memory
from collectors.processes import collect_processes
from collectors.disk import collect_disk
from collectors.system_info import collect_system_info
from collectors.network import collect_network
from collectors.score import calc_score
from alerts import check_alerts
from controllers.process_control import kill_process, renice_process

# Connected WebSocket clients
clients: list[WebSocket] = []

# Configurable refresh interval (seconds)
refresh_interval: float = 1.0
paused: bool = False


def collect_all() -> dict:
    """Run all collectors and merge into single payload."""
    data = {
        "cpu": collect_cpu(),
        "memory": collect_memory(),
        "processes": collect_processes(),
        "disk": collect_disk(),
        "system": collect_system_info(),
        "network": collect_network(),
        "score": calc_score(),
        "timestamp": time.time(),
    }
    data["alerts"] = check_alerts(data)
    return data


async def broadcast_loop():
    """Background task: collect metrics and broadcast to all clients."""
    global paused
    while True:
        if not paused and clients:
            try:
                data = collect_all()
                payload = json.dumps(data)
                disconnected = []
                for ws in clients:
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        disconnected.append(ws)
                for ws in disconnected:
                    clients.remove(ws)
            except Exception as e:
                print(f"Broadcast error: {e}")
        await asyncio.sleep(refresh_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan manager — starts broadcast on startup, cleans up on shutdown."""
    task = asyncio.create_task(broadcast_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="SysScope", lifespan=lifespan)

# Serve frontend static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")


@app.get("/")
async def root():
    """Serve the dashboard HTML."""
    return FileResponse("../frontend/index.html")


async def handle_command(ws: WebSocket, message: str):
    """Process incoming commands from frontend."""
    global refresh_interval, paused
    try:
        cmd = json.loads(message)
        action = cmd.get("action")
        result = {"action": action}

        if action == "kill":
            result.update(kill_process(cmd["pid"], cmd.get("signal", "SIGTERM")))

        elif action == "renice":
            result.update(renice_process(cmd["pid"], cmd["nice"]))

        elif action == "set_interval":
            secs = cmd.get("seconds", 1)
            if secs in (1, 2, 5):
                refresh_interval = float(secs)
                result["success"] = True
                result["message"] = f"Refresh interval set to {secs}s"

        elif action == "pause":
            paused = True
            result = {"action": "pause", "success": True}

        elif action == "resume":
            paused = False
            result = {"action": "resume", "success": True}

        else:
            result = {"error": f"Unknown action: {action}"}

        await ws.send_text(json.dumps(result))

    except json.JSONDecodeError:
        await ws.send_text(json.dumps({"error": "Invalid JSON"}))


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket endpoint for real-time data + commands."""
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            message = await ws.receive_text()
            await handle_command(ws, message)
    except WebSocketDisconnect:
        if ws in clients:
            clients.remove(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
```

---

### Task 12: Collectors Package Init

**File:** `backend/controllers/__init__.py` — empty  
**File:** `backend/collectors/__init__.py` — empty

---

### Run & Verify

```bash
cd backend
source venv/bin/activate
python main.py
```

Expected: Server starts on `0.0.0.0:8765`. WebSocket available at `ws://VM_IP:8765/ws`.

Test with: `wscat -c ws://localhost:8765/ws` — should receive JSON metrics every 1 second.

---

**Part 2 complete.** Say **"continue"** for Part 3 (Phase 2: Frontend — index.html, dashboard.css design system, app.js WebSocket client, all panel renderers).
