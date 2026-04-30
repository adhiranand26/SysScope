import subprocess
import json
import re
import os

def collect_gpu() -> dict:
    data = {
        "name": "Apple M4",
        "vram_total": None,
        "vram_used": None,
        "usage_percent": None,
        "temperature": None,
        "available": True
    }

    try:
        # 1. Basic info from system_profiler
        sp_path = "/usr/sbin/system_profiler"
        result = subprocess.run([sp_path, 'SPDisplaysDataType', '-json'], capture_output=True, text=True)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            if "SPDisplaysDataType" in info and len(info["SPDisplaysDataType"]) > 0:
                gpu_info = info["SPDisplaysDataType"][0]
                data["name"] = gpu_info.get("sppci_model", "Apple M4")
                cores = gpu_info.get("sppci_cores")
                if cores: data["name"] += f" ({cores} Cores)"
    except: pass

    try:
        # 2. Extract metrics using direct ioreg call with grep to ensure we get exactly the lines we want
        # This is often more reliable than parsing the entire 10MB ioreg output in Python
        def get_ioreg_val(key):
            cmd = f"/usr/sbin/ioreg -l | grep '\"{key}\"' | head -n 1"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout:
                match = re.search(r'=\s*(\d+)', res.stdout)
                return int(match.group(1)) if match else None
            return None

        data["usage_percent"] = get_ioreg_val("Device Utilization %")
        data["vram_used"] = get_ioreg_val("In use system memory")
        
        vram_mb = get_ioreg_val("VRAM,totalMB")
        if vram_mb:
            data["vram_total"] = vram_mb * 1024 * 1024
    except: pass

    return data
