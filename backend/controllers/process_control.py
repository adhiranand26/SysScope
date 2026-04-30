import os
import signal
import psutil

def kill_process(pid: int, sig: str = "SIGTERM") -> dict:
    """Send signal to a process."""
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
    """Change process priority (nice value)."""
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
