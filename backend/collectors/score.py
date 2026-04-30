import psutil

def calc_score() -> int:
    """Calculate system performance score (0-100)."""
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory().percent
    swap = psutil.swap_memory().percent
    cores = max(psutil.cpu_count(), 1)
    load_ratio = min(100, (psutil.getloadavg()[0] / cores) * 100)

    cpu_score = max(0, 100 - cpu)
    mem_score = max(0, 100 - mem)
    swap_score = max(0, 100 - swap * 2)
    load_score = max(0, 100 - load_ratio)

    total = int(
        cpu_score * 0.35
        + mem_score * 0.30
        + swap_score * 0.15
        + load_score * 0.20
    )
    return max(0, min(100, total))
