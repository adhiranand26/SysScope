import subprocess
import json
import re

def collect_gpu() -> dict:
    data = {
        "name": "Apple Silicon GPU",
        "vram_total": None,
        "vram_used": None,
        "usage_percent": None,
        "temperature": None,
        "available": True
    }

    try:
        # Get Name and VRAM
        result = subprocess.run(['system_profiler', 'SPDisplaysDataType', '-json'], capture_output=True, text=True)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            if "SPDisplaysDataType" in info and len(info["SPDisplaysDataType"]) > 0:
                gpu_info = info["SPDisplaysDataType"][0]
                
                # Check for Apple Silicon memory
                vram = gpu_info.get("spdisplays_vram") or gpu_info.get("spdisplays_vram_shared")
                if vram:
                    if "GB" in vram:
                        data["vram_total"] = int(float(vram.replace('GB', '').strip()) * 1024 * 1024 * 1024)
                    elif "MB" in vram:
                        data["vram_total"] = int(float(vram.replace('MB', '').strip()) * 1024 * 1024)
                
                name = gpu_info.get("sppci_model")
                if not name and "ndrvs" in gpu_info and len(gpu_info["ndrvs"]) > 0:
                    name = gpu_info["ndrvs"][0].get("_name")
                
                if name:
                    data["name"] = name
    except Exception:
        pass

    try:
        # Get usage % from ioreg
        result2 = subprocess.run(['ioreg', '-l', '-n', 'AGXAccelerator'], capture_output=True, text=True)
        if result2.returncode == 0:
            match = re.search(r'"Device Utilization %" = (\d+)', result2.stdout)
            if match:
                data["usage_percent"] = int(match.group(1))
    except Exception:
        pass

    return data
