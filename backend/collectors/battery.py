import psutil
import subprocess
import re

def collect_battery() -> dict:
    data = {
        "available": False,
        "percent": None,
        "charging": None,
        "time_left_seconds": None,
        "time_left_formatted": None
    }
    
    b = psutil.sensors_battery()
    if b is not None:
        data["available"] = True
        data["percent"] = b.percent
        data["charging"] = b.power_plugged
        if b.secsleft > 0 and b.secsleft != psutil.POWER_TIME_UNKNOWN:
            data["time_left_seconds"] = b.secsleft
            hrs = b.secsleft // 3600
            mins = (b.secsleft % 3600) // 60
            data["time_left_formatted"] = f"{hrs}h {mins}m"
        return data

    # Fallback to pmset if psutil returns None
    try:
        result = subprocess.run(['pmset', '-g', 'batt'], capture_output=True, text=True)
        if result.returncode == 0:
            out = result.stdout
            if "InternalBattery" in out or "Battery" in out:
                data["available"] = True
                
                # Parse percent
                pct_match = re.search(r'(\d+)%', out)
                if pct_match:
                    data["percent"] = int(pct_match.group(1))
                
                # Parse charging status
                if "charging" in out or "AC Power" in out:
                    data["charging"] = True
                elif "discharging" in out or "Battery Power" in out:
                    data["charging"] = False
                    
                # Time left parsing is complex from pmset, but we'll try basic
                time_match = re.search(r'(\d+):(\d+)\s+remaining', out)
                if time_match:
                    hrs = int(time_match.group(1))
                    mins = int(time_match.group(2))
                    data["time_left_seconds"] = hrs * 3600 + mins * 60
                    data["time_left_formatted"] = f"{hrs}h {mins}m"
    except Exception:
        pass

    return data
