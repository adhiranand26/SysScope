import subprocess
import json
import re
import os

def collect_gpu() -> dict:
    data = {
        "name": "Apple GPU",
        "vram_total": None,
        "vram_used": None,
        "usage_percent": None,
        "temperature": None,
        "available": True
    }

    # Try absolute path for system_profiler
    sp_path = "/usr/sbin/system_profiler"
    if not os.path.exists(sp_path):
        sp_path = "system_profiler"

    try:
        # Get Name and VRAM
        result = subprocess.run([sp_path, 'SPDisplaysDataType', '-json'], capture_output=True, text=True)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            if "SPDisplaysDataType" in info and len(info["SPDisplaysDataType"]) > 0:
                gpu_info = info["SPDisplaysDataType"][0]
                
                # Check for model name
                name = gpu_info.get("sppci_model")
                if not name and "spdisplays_ndrvs" in gpu_info and len(gpu_info["spdisplays_ndrvs"]) > 0:
                    # Sometimes displays have names that describe the chip
                    pass 
                
                if name:
                    data["name"] = name
                
                # Check for Apple Silicon memory (it's shared)
                vram = gpu_info.get("spdisplays_vram") or gpu_info.get("spdisplays_vram_shared")
                if vram:
                    if "GB" in vram:
                        data["vram_total"] = int(float(vram.replace('GB', '').strip()) * 1024 * 1024 * 1024)
                    elif "MB" in vram:
                        data["vram_total"] = int(float(vram.replace('MB', '').strip()) * 1024 * 1024)
                
                # Cores
                cores = gpu_info.get("sppci_cores")
                if cores:
                    data["name"] += f" ({cores} Cores)"
    except Exception:
        pass

    try:
        # Get usage % from ioreg
        result2 = subprocess.run(['/usr/sbin/ioreg', '-l', '-n', 'AGXAccelerator'], capture_output=True, text=True)
        if result2.returncode == 0:
            match = re.search(r'"Device Utilization %" = (\d+)', result2.stdout)
            if match:
                data["usage_percent"] = int(match.group(1))
    except Exception:
        pass

    return data
