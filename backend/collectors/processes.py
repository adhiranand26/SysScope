import psutil

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
    "memory_percent", "num_threads", "cmdline", "username", "nice", "exe"
]

def collect_processes() -> dict:
    """Collect process list from /proc/[pid]/ entries."""
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
            # Truncated cmd for the small table
            cmd_short = " ".join(cmdline[:4]) if cmdline else (info["name"] or "")
            # Full cmd for the modal
            cmd_full = " ".join(cmdline) if cmdline else (info["name"] or "")
            exe_path = info.get("exe") or "Unknown"

            procs.append({
                "pid": info["pid"],
                "ppid": info["ppid"] or 0,
                "name": info["name"] or "",
                "state": state,
                "cpu": round(info["cpu_percent"] or 0, 1),
                "mem": round(info["memory_percent"] or 0, 1),
                "threads": info["num_threads"] or 0,
                "nice": info["nice"] if info["nice"] is not None else 0,
                "cmd": cmd_short,
                "full_cmd": cmd_full,
                "exe": exe_path,
                "user": info["username"] or "",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Sort by CPU usage by default
    procs.sort(key=lambda x: x["cpu"], reverse=True)

    return {
        "list": procs[:100],
        "total": len(procs),
        "states": state_counts,
    }
