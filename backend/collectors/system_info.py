import platform
import psutil
import time
import os

boot_time = psutil.boot_time()

def collect_system_info() -> dict:
    # Uptime
    uptime_seconds = int(time.time() - boot_time)
    
    # Format uptime
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    if days > 0:
        uptime_formatted = f"{days}d {hours}h {minutes}m"
    else:
        uptime_formatted = f"{hours}h {minutes}m"
        
    # Hostname, Distro, Kernel
    hostname = platform.node()
    distro = f"macOS {platform.mac_ver()[0]}"
    kernel = platform.release()
    
    # Load averages (1, 5, 15 min)
    try:
        load1, load5, load15 = os.getloadavg()
    except Exception:
        load1, load5, load15 = (0.0, 0.0, 0.0)

    # Top processes
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            procs.append(p.info)
        except Exception:
            pass
            
    top_cpu = sorted(procs, key=lambda p: p['cpu_percent'] or 0, reverse=True)[:3]
    top_ram = sorted(procs, key=lambda p: p['memory_percent'] or 0, reverse=True)[:3]

    return {
        "distro": distro,
        "kernel": kernel,
        "hostname": hostname,
        "uptime_formatted": uptime_formatted,
        "load_1": round(load1, 2),
        "load_5": round(load5, 2),
        "load_15": round(load15, 2),
        "cpu_name": platform.processor(),
        "top_cpu": top_cpu,
        "top_ram": top_ram
    }
