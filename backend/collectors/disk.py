import psutil

_prev_counters = None
_prev_read = 0
_prev_write = 0

def collect_disk() -> dict:
    """Collect disk I/O metrics from /proc/diskstats."""
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
