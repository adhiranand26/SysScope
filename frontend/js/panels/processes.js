/**
 * SysScope — Process Table Renderer
 * Simplified view for glanceability, with detailed modal on click.
 */

window.ProcessPanel = (function () {
    'use strict';

    let currentSort = 'cpu';
    let sortDesc = true;
    let initialized = false;

    function init(container) {
        container.innerHTML = `
            <div class="table-header" id="process-table-header" style="display: grid; grid-template-columns: 70px 1fr 60px 60px;">
                <span data-sort="pid">PID</span>
                <span data-sort="name">PROCESS</span>
                <span data-sort="cpu" class="sort-active">%CPU ↓</span>
                <span data-sort="mem">%MEM</span>
            </div>
            <div id="process-list"></div>
        `;

        const headers = document.querySelectorAll('#process-table-header span');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                if (currentSort === sortKey) {
                    sortDesc = !sortDesc;
                } else {
                    currentSort = sortKey;
                    sortDesc = true;
                }

                headers.forEach(h => {
                    h.classList.remove('sort-active');
                    h.textContent = h.textContent.replace(' ↓', '').replace(' ↑', '');
                });
                th.classList.add('sort-active');
                th.textContent += sortDesc ? ' ↓' : ' ↑';
            });
        });

        initialized = true;
    }

    function render(data) {
        const container = document.getElementById('processes-body');
        if (!container) return;
        if (!initialized) init(container);

        const stateContainer = document.getElementById('process-states');
        if (stateContainer && data.states) {
            const st = data.states;
            stateContainer.innerHTML = `
                <div class="state-badges">
                    <span class="badge"><span class="dot dot-running"></span> ${st.running || 0} run</span>
                    <span class="badge"><span class="dot dot-sleeping"></span> ${st.sleeping || 0} slp</span>
                    <span>${data.total} total</span>
                </div>
            `;
        }

        let procs = [...data.list];
        procs.sort((a, b) => {
            let valA = a[currentSort];
            let valB = b[currentSort];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
                if (valA < valB) return sortDesc ? 1 : -1;
                if (valA > valB) return sortDesc ? -1 : 1;
                return 0;
            }
            return sortDesc ? valB - valA : valA - valB;
        });

        const listEl = document.getElementById('process-list');
        if (listEl) {
            const searchValue = document.getElementById('process-search')?.value.toLowerCase() || '';

            listEl.innerHTML = procs.map(p => {
                const isHog = p.cpu > 50;
                const hogClass = isHog ? 'cpu-hog' : '';

                let hiddenClass = '';
                if (searchValue) {
                    const match = p.name.toLowerCase().includes(searchValue) ||
                                  p.pid.toString() === searchValue;
                    if (!match) hiddenClass = 'hidden';
                }

                const procData = JSON.stringify(p).replace(/'/g, '&apos;');

                return `
                    <div class="table-row ${hogClass} ${hiddenClass} process-row" data-proc='${procData}' 
                         style="display: grid; grid-template-columns: 70px 1fr 60px 60px; cursor: pointer;">
                        <span class="text-dim">${p.pid}</span>
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;">${p.name}</span>
                        <span class="${isHog ? 'text-bright' : 'text-accent'}" style="text-align:right;padding-right:10px">${p.cpu.toFixed(1)}</span>
                        <span style="text-align:right">${p.mem.toFixed(1)}</span>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.process-row').forEach(row => {
                row.addEventListener('click', () => {
                    const proc = JSON.parse(row.dataset.proc.replace(/&apos;/g, "'"));
                    if (window.SysScope.showProcessModal) {
                        window.SysScope.showProcessModal(proc);
                    }
                });
            });
        }
    }

    return { render };
})();
