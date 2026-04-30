/**
 * SysScope — System Info Panel Renderer
 */

window.SystemPanel = (function () {
    'use strict';

    function init(container) {
        container.innerHTML = `
            <div class="kv-grid" id="sys-kv">
                <span class="kv-key">OS</span><span class="kv-val" id="sys-os">--</span>
                <span class="kv-key">Host</span><span class="kv-val" id="sys-host">--</span>
                <span class="kv-key">Kernel</span><span class="kv-val" id="sys-kernel">--</span>
                <span class="kv-key">CPU</span><span class="kv-val" id="sys-cpu">--</span>
                <span class="kv-key">Load</span><span class="kv-val" id="sys-load">--</span>
            </div>
            <div id="sys-hogs" class="mt-4" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div id="sys-hogs-cpu"></div>
                <div id="sys-hogs-ram"></div>
            </div>
        `;
    }

    function render(data) {
        const container = document.getElementById('system-body');
        const headerUptime = document.getElementById('sys-uptime');
        if (!container) return;
        
        console.log("Raw data.system object:", data);
        
        if (!document.getElementById('sys-kv')) {
            init(container);
        }

        if (headerUptime) {
            headerUptime.textContent = data.uptime_formatted || 'N/A';
        }

        document.getElementById('sys-os').textContent = data.distro || 'N/A';
        document.getElementById('sys-host').textContent = data.hostname || 'N/A';
        document.getElementById('sys-kernel').textContent = data.kernel || 'N/A';
        document.getElementById('sys-cpu').textContent = data.cpu_name || 'N/A';
        
        if (data.load_1 !== undefined) {
            document.getElementById('sys-load').textContent = `${data.load_1}, ${data.load_5}, ${data.load_15}`;
        } else {
            document.getElementById('sys-load').textContent = 'N/A';
        }

        const cpuHogs = document.getElementById('sys-hogs-cpu');
        const ramHogs = document.getElementById('sys-hogs-ram');

        if (cpuHogs && data.top_cpu && data.top_cpu.length > 0) {
            cpuHogs.innerHTML = `
                <div class="text-dim mb-2" style="font-size:var(--font-size-xs);text-transform:uppercase;letter-spacing:1px">Top CPU</div>
                ${data.top_cpu.map(p => `
                    <div class="kv-grid" style="font-size:var(--font-size-xs); margin-bottom:2px">
                        <span class="kv-key" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px">${p.name || 'N/A'}</span>
                        <span class="kv-val accent" style="text-align:right">${(p.cpu_percent || 0).toFixed(1)}%</span>
                    </div>
                `).join('')}
            `;
        } else if (cpuHogs) {
            cpuHogs.innerHTML = '<div class="text-dim">No CPU data</div>';
        }

        if (ramHogs && data.top_ram && data.top_ram.length > 0) {
            ramHogs.innerHTML = `
                <div class="text-dim mb-2" style="font-size:var(--font-size-xs);text-transform:uppercase;letter-spacing:1px">Top RAM</div>
                ${data.top_ram.map(p => `
                    <div class="kv-grid" style="font-size:var(--font-size-xs); margin-bottom:2px">
                        <span class="kv-key" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px">${p.name || 'N/A'}</span>
                        <span class="kv-val accent" style="text-align:right">${(p.memory_percent || 0).toFixed(1)}%</span>
                    </div>
                `).join('')}
            `;
        } else if (ramHogs) {
            ramHogs.innerHTML = '<div class="text-dim">No RAM data</div>';
        }
    }

    return { render };
})();
