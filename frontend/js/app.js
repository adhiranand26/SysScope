/**
 * SysScope — Main Application
 * WebSocket client, state dispatcher, keyboard shortcuts, refresh controls.
 */

(function () {
    'use strict';

    // --- State ---
    let ws = null;
    let reconnectDelay = 1000;
    const MAX_RECONNECT_DELAY = 10000;
    let isPaused = false;
    let currentInterval = 1;

    // --- DOM refs ---
    const topbar = {
        summary: document.getElementById('system-summary'),
        score: document.getElementById('score-badge'),
    };
    const bottombar = {
        alertSummary: document.getElementById('alert-summary'),
    };

    // --- Helpers ---
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const val = bytes / Math.pow(1024, i);
        return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
    }

    function formatSpeed(bytesPerSec) {
        return `${formatBytes(bytesPerSec)}/s`;
    }

    function formatTime(timestamp) {
        const d = new Date(timestamp * 1000);
        return d.toLocaleTimeString('en-US', { hour12: false });
    }

    // Export helpers globally for panel modules
    window.SysScope = { formatBytes, formatSpeed, formatTime };

    // --- WebSocket ---
    function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${location.host}/ws`;

        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[SysScope] Connected');
            reconnectDelay = 1000;
            bottombar.alertSummary.textContent = '● Connected';
            bottombar.alertSummary.style.color = 'var(--state-sleeping)';
            // Reset interval to current setting
            sendCommand('set_interval', { seconds: currentInterval });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Ignore command responses (they have "action" key)
                if (data.action) {
                    handleCommandResponse(data);
                    return;
                }

                dispatch(data);
            } catch (e) {
                console.error('[SysScope] Parse error:', e);
            }
        };

        ws.onclose = () => {
            console.log(`[SysScope] Disconnected. Reconnecting in ${reconnectDelay}ms...`);
            bottombar.alertSummary.textContent = '○ Disconnected — reconnecting...';
            bottombar.alertSummary.style.color = 'var(--danger)';
            setTimeout(connect, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        };

        ws.onerror = (err) => {
            console.error('[SysScope] WebSocket error:', err);
            ws.close();
        };
    }

    function sendCommand(action, params = {}) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, ...params }));
        }
    }

    function handleCommandResponse(data) {
        if (data.success === false) {
            console.warn(`[SysScope] Command failed: ${data.error}`);
        }
        if (data.action === 'kill' || data.action === 'renice') {
            // Close modal after successful process control
            const modal = document.getElementById('process-modal');
            if (data.success && modal) {
                modal.classList.add('hidden');
            }
        }
    }

    // --- Dispatch data to panels ---
    function dispatch(data) {
        // Update top bar
        if (data.system) {
            topbar.summary.textContent =
                `${data.system.hostname} · ${data.system.kernel} · up ${data.system.uptime_formatted}`;
        }

        if (data.score !== undefined) {
            const score = data.score;
            topbar.score.textContent = `▲ Score: ${score}/100`;
            topbar.score.className = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
        }

        // Dispatch to panel renderers (each defined in their own file)
        if (data.cpu && window.CpuPanel) window.CpuPanel.render(data.cpu);
        if (data.memory && window.MemoryPanel) window.MemoryPanel.render(data.memory);
        if (data.processes && window.ProcessPanel) window.ProcessPanel.render(data.processes);
        if (data.disk && window.DiskPanel) window.DiskPanel.render(data.disk);
        if (data.system && window.SystemPanel) window.SystemPanel.render(data.system);
        if (data.network && window.NetworkPanel) window.NetworkPanel.render(data.network);
        if (data.alerts && window.AlertsPanel) window.AlertsPanel.render(data.alerts);

        // Update bottom bar alert count
        if (data.alerts) {
            const count = data.alerts.length;
            if (count > 0) {
                bottombar.alertSummary.textContent = `⚠ ${count} alert${count > 1 ? 's' : ''}`;
                bottombar.alertSummary.style.color = 'var(--accent)';
            } else {
                bottombar.alertSummary.textContent = '● System healthy';
                bottombar.alertSummary.style.color = 'var(--state-sleeping)';
            }
        }
    }

    // --- Keyboard Shortcuts ---
    function setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't capture when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'h':
                    if (window.HelpOverlay) window.HelpOverlay.toggle();
                    break;
                case 'escape':
                    // Close any open overlay
                    document.getElementById('help-overlay')?.classList.add('hidden');
                    document.getElementById('process-modal')?.classList.add('hidden');
                    break;
                case 'p':
                    togglePause();
                    break;
                case '1':
                    setInterval(1);
                    break;
                case '2':
                    setInterval(2);
                    break;
                case '5':
                    setInterval(5);
                    break;
            }
        });
    }

    // --- Refresh Controls ---
    function setInterval(seconds) {
        currentInterval = seconds;
        sendCommand('set_interval', { seconds });

        // Update button states
        document.querySelectorAll('.ctrl-btn[data-interval]').forEach((btn) => {
            btn.classList.toggle('active', parseInt(btn.dataset.interval) === seconds);
        });
    }

    function togglePause() {
        isPaused = !isPaused;
        sendCommand(isPaused ? 'pause' : 'resume');

        const btn = document.getElementById('btn-pause');
        if (btn) {
            btn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
            btn.classList.toggle('active', isPaused);
        }
    }

    function setupControls() {
        // Interval buttons
        document.querySelectorAll('.ctrl-btn[data-interval]').forEach((btn) => {
            btn.addEventListener('click', () => {
                setInterval(parseInt(btn.dataset.interval));
            });
        });

        // Pause button
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', togglePause);
        }
    }

    // --- Process Control (called by ProcessPanel) ---
    window.SysScope.killProcess = function (pid, signal) {
        sendCommand('kill', { pid, signal });
    };

    window.SysScope.reniceProcess = function (pid, nice) {
        sendCommand('renice', { pid, nice });
    };

    window.SysScope.showProcessModal = function (proc) {
        const modal = document.getElementById('process-modal');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <h3>┤ PID ${proc.pid} — ${proc.name} ├</h3>
            <div class="kv-grid mb-8">
                <span class="kv-key">Command</span><span class="kv-val">${proc.cmd}</span>
                <span class="kv-key">User</span><span class="kv-val">${proc.user}</span>
                <span class="kv-key">State</span><span class="kv-val state-${proc.state}">${proc.state}</span>
                <span class="kv-key">CPU</span><span class="kv-val">${proc.cpu}%</span>
                <span class="kv-key">Memory</span><span class="kv-val">${proc.mem}%</span>
                <span class="kv-key">Threads</span><span class="kv-val">${proc.threads}</span>
                <span class="kv-key">Nice</span><span class="kv-val">${proc.nice}</span>
            </div>
            <div class="modal-actions">
                <button class="btn-kill" onclick="SysScope.killProcess(${proc.pid}, 'SIGTERM')">SIGTERM</button>
                <button class="btn-kill" onclick="SysScope.killProcess(${proc.pid}, 'SIGKILL')">SIGKILL</button>
            </div>
            <div class="mb-4">
                <span class="stat-label">Nice Value: <span id="nice-display">${proc.nice}</span></span>
                <input type="range" class="nice-slider" min="-20" max="19" value="${proc.nice}"
                    oninput="document.getElementById('nice-display').textContent=this.value"
                    onchange="SysScope.reniceProcess(${proc.pid}, parseInt(this.value))">
            </div>
            <button class="btn-close" onclick="document.getElementById('process-modal').classList.add('hidden')">
                Close [Esc]
            </button>
        `;

        modal.classList.remove('hidden');
    };

    // --- Init ---
    function init() {
        setupKeyboard();
        setupControls();
        connect();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
