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
                        data["dirty_pages_bytes"] = val * 4096
    except (FileNotFoundError, PermissionError):
        pass

    return data
