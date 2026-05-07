import asyncio
import json
import time
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables from parent directory .env
load_dotenv(dotenv_path="../.env")
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from collectors.cpu import collect_cpu
from collectors.memory import collect_memory
from collectors.processes import collect_processes
from collectors.disk import collect_disk
from collectors.system_info import collect_system_info
from collectors.network import collect_network
from collectors.gpu import collect_gpu
from collectors.battery import collect_battery
from collectors.score import calc_score
from alerts import check_alerts
from controllers.process_control import kill_process, renice_process
import httpx

async def call_inception_api(prompt: str):
    """Call the Inception AI API."""
    api_key = os.getenv("INCEPTION_API_KEY")
    if not api_key:
        return {"error": "INCEPTION_API_KEY not found in environment"}

    url = "https://api.inceptionlabs.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": "mercury-2",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "reasoning_effort": "instant",
        "temperature": 0.75,
        "max_tokens": 8192
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

# Connected WebSocket clients
clients: list[WebSocket] = []

# Configurable refresh interval (seconds)
refresh_interval: float = 1.0
paused: bool = False


def collect_all() -> dict:
    """Run all collectors and merge into single payload."""
    data = {
        "cpu": collect_cpu(),
        "memory": collect_memory(),
        "processes": collect_processes(),
        "disk": collect_disk(),
        "system": collect_system_info(),
        "network": collect_network(),
        "gpu": collect_gpu(),
        "battery": collect_battery(),
        "score": calc_score(),
        "timestamp": time.time(),
    }
    data["alerts"] = check_alerts(data)
    return data


async def broadcast_loop():
    """Background task: collect metrics and broadcast to all clients."""
    global paused
    while True:
        if not paused and clients:
            try:
                data = collect_all()
                payload = json.dumps(data)
                disconnected = []
                for ws in clients:
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        disconnected.append(ws)
                for ws in disconnected:
                    clients.remove(ws)
            except Exception as e:
                print(f"Broadcast error: {e}")
        await asyncio.sleep(refresh_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan manager — starts broadcast on startup, cleans up on shutdown."""
    task = asyncio.create_task(broadcast_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="SysScope", lifespan=lifespan)

# Serve frontend static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")


@app.get("/")
async def root():
    """Serve the dashboard HTML."""
    return FileResponse("../frontend/index.html")


async def handle_command(ws: WebSocket, message: str):
    """Process incoming commands from frontend."""
    global refresh_interval, paused
    try:
        cmd = json.loads(message)
        action = cmd.get("action")
        result = {"action": action}

        if action == "kill":
            result.update(kill_process(cmd["pid"], cmd.get("signal", "SIGTERM")))

        elif action == "renice":
            result.update(renice_process(cmd["pid"], cmd["nice"]))

        elif action == "set_interval":
            secs = cmd.get("seconds", 1)
            if secs in (1, 2, 5):
                refresh_interval = float(secs)
                result["success"] = True
                result["message"] = f"Refresh interval set to {secs}s"

        elif action == "pause":
            paused = True
            result = {"action": "pause", "success": True}

        elif action == "resume":
            paused = False
            result = {"action": "resume", "success": True}

        elif action == "ai_chat":
            prompt = cmd.get("prompt", "What is a diffusion model?")
            api_response = await call_inception_api(prompt)
            result = {"action": "ai_chat", "response": api_response}

        else:
            result = {"error": f"Unknown action: {action}"}

        await ws.send_text(json.dumps(result))

    except json.JSONDecodeError:
        await ws.send_text(json.dumps({"error": "Invalid JSON"}))


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket endpoint for real-time data + commands."""
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            message = await ws.receive_text()
            await handle_command(ws, message)
    except WebSocketDisconnect:
        if ws in clients:
            clients.remove(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
