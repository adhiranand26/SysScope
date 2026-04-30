import psutil
import time

_last_net = None
_last_time = 0

def collect_network() -> dict:
    global _last_net, _last_time
    
    current_net = psutil.net_io_counters(pernic=True)
    current_time = time.time()
    
    # Calculate total across all interfaces for overall speed
    total_sent = sum(net.bytes_sent for net in current_net.values())
    total_recv = sum(net.bytes_recv for net in current_net.values())
    
    speed_up = 0
    speed_down = 0
    
    if _last_net is not None:
        dt = current_time - _last_time
        if dt > 0:
            last_sent = sum(net.bytes_sent for net in _last_net.values())
            last_recv = sum(net.bytes_recv for net in _last_net.values())
            speed_up = (total_sent - last_sent) / dt
            speed_down = (total_recv - last_recv) / dt
            
    _last_net = current_net
    _last_time = current_time

    return {
        "bytes_sent": total_sent,
        "bytes_recv": total_recv,
        "upload_speed": speed_up,
        "download_speed": speed_down,
        "interfaces": list(current_net.keys())
    }
