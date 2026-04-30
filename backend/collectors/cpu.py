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
