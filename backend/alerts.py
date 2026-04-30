import time

_active_alerts = {}
_alert_history = []

THRESHOLDS = {
    "cpu": 80.0,
    "ram": 70.0,
    "swap": 50.0,
    "disk": 85.0,
    "gpu_temp": 80.0,
    "battery": 15.0,
    "network": 100 * 1024 * 1024, # 100 MB/s
}

COOLDOWN = 60

def check_alerts(data: dict) -> list:
    global _alert_history
    current_time = time.time()
    
    def _add_alert(key: str, msg: str, severity: str = "warning"):
        if key in _active_alerts and current_time - _active_alerts[key] < COOLDOWN:
            return
            
        _active_alerts[key] = current_time
        _alert_history.insert(0, {
            "key": key,
            "message": msg,
            "severity": severity,
            "timestamp": current_time
        })

    # CPU
    cpu_pct = data.get("cpu", {}).get("overall", 0)
    if cpu_pct > THRESHOLDS["cpu"]:
        _add_alert("cpu", f"CPU usage at {cpu_pct:.1f}% (> {THRESHOLDS['cpu']}%)", "critical")

    # RAM
    mem = data.get("memory", {})
    if mem.get("total", 0) > 0:
        ram_pct = (mem["used"] / mem["total"]) * 100
        if ram_pct > THRESHOLDS["ram"]:
            _add_alert("ram", f"RAM usage at {ram_pct:.1f}% (> {THRESHOLDS['ram']}%)", "warning")
            
        swap_pct = mem.get("swap_percent", 0)
        if swap_pct > THRESHOLDS["swap"]:
            _add_alert("swap", f"Swap usage at {swap_pct:.1f}% (> {THRESHOLDS['swap']}%)", "warning")

    # Disk
    for p in data.get("disk", {}).get("partitions", []):
        if p["percent"] > THRESHOLDS["disk"]:
            _add_alert(f"disk_{p['mount']}", f"Disk {p['mount']} at {p['percent']:.1f}% (> {THRESHOLDS['disk']}%)", "warning")

    # GPU Temp
    gpu = data.get("gpu", {})
    if gpu.get("present") and gpu.get("temp", 0) > THRESHOLDS["gpu_temp"]:
        _add_alert("gpu", f"GPU temp at {gpu['temp']}°C (> {THRESHOLDS['gpu_temp']}°C)", "critical")

    # Battery
    bat = data.get("battery", {})
    if bat.get("present") and bat.get("percent", 100) < THRESHOLDS["battery"] and bat.get("status") != "Charging":
        _add_alert("battery", f"Battery low at {bat['percent']}% (< {THRESHOLDS['battery']}%)", "critical")

    # Network Spike
    net = data.get("network", {})
    total_net = net.get("upload_speed", 0) + net.get("download_speed", 0)
    if total_net > THRESHOLDS["network"]:
        _add_alert("network", f"Network spike: {total_net/1024/1024:.1f} MB/s (> 100 MB/s)", "warning")

    _alert_history = _alert_history[:20]
    return _alert_history

def clear_alerts():
    global _alert_history, _active_alerts
    _alert_history = []
    _active_alerts = {}
