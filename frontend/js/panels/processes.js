/**
 * SysScope — Process Table Renderer
 * Sortable table, state colors, modal interaction, highlighting CPU hogs.
 */

window.ProcessPanel = (function () {
    'use strict';

    let currentSort = 'cpu';
    let sortDesc = true;
    let initialized = false;

    function init(container) {
        // We inject the table header into the container and prepare the body
        container.innerHTML = `
            <div class="table-header" id="process-table-header">
                <span data-sort="pid">PID</span>
                <span data-sort="ppid">PPID</span>
                <span data-sort="user">USER</span>
                <span data-sort="state">STATE</span>
                <span class="sort-active" data-sort="cpu">%CPU ↓</span>
                <span data-sort="mem">%MEM</span>
                <span data-sort="threads">THR</span>
                <span data-sort="name">COMMAND</span>
            </div>
            <div id="process-list"></div>
        `;

        // Setup sorting listeners
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

                // Update visual headers
                headers.forEach(h => {
                    h.classList.remove('sort-active');
                    h.textContent = h.textContent.replace(' ↓', '').replace(' ↑', '');
                });
                th.classList.add('sort-active');
                th.textContent += sortDesc ? ' ↓' : ' ↑';

                // Next render will use the new sort order
            });
        });

        initialized = true;
    }

    function render(data) {
        const container = document.getElementById('processes-body');
        if (!container) return;
        if (!initialized) init(container);

        // Update state badges in the panel header
        const stateContainer = document.getElementById('process-states');
        if (stateContainer && data.states) {
            const st = data.states;
            stateContainer.innerHTML = `
                <div class="state-badges">
                    <span class="badge"><span class="dot dot-running"></span> ${st.running || 0} run</span>
                    <span class="badge"><span class="dot dot-sleeping"></span> ${st.sleeping || 0} slp</span>
                    <span class="badge"><span class="dot dot-zombie"></span> ${st.zombie || 0} zmb</span>
                    <span>${data.total} total</span>
                </div>
            `;
        }

        // Sort data
        let procs = [...data.list];
        procs.sort((a, b) => {
            let valA = a[currentSort];
            let valB = b[currentSort];

            // String comparison
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
                if (valA < valB) return sortDesc ? 1 : -1;
                if (valA > valB) return sortDesc ? -1 : 1;
                return 0;
            }

            // Numeric comparison
            return sortDesc ? valB - valA : valA - valB;
        });

        // Render rows
        const listEl = document.getElementById('process-list');
        if (listEl) {
            // Keep track of search filter class if exists
            const searchValue = document.getElementById('process-search')?.value.toLowerCase() || '';

            listEl.innerHTML = procs.map(p => {
                // CPU Hog highlighting (> 50% core usage)
                const isHog = p.cpu > 50;
                const hogClass = isHog ? 'cpu-hog' : '';

                // Search matching
                let hiddenClass = '';
                if (searchValue) {
                    const match = p.name.toLowerCase().includes(searchValue) ||
                                  p.pid.toString() === searchValue ||
                                  p.state.toLowerCase() === searchValue;
                    if (!match) hiddenClass = 'hidden';
                }

                // Store process object in JSON attribute for modal
                const procData = JSON.stringify(p).replace(/'/g, '&apos;');

                return `
                    <div class="table-row ${hogClass} ${hiddenClass} process-row" data-proc='${procData}'>
                        <span>${p.pid}</span>
                        <span class="text-dim">${p.ppid}</span>
                        <span class="text-dim" style="overflow:hidden;text-overflow:ellipsis">${p.user}</span>
                        <span class="state-${p.state}">${p.state}</span>
                        <span class="${isHog ? 'text-bright' : 'text-accent'}">${p.cpu.toFixed(1)}</span>
                        <span>${p.mem.toFixed(1)}</span>
                        <span class="text-dim">${p.threads}</span>
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.cmd}</span>
                    </div>
                `;
            }).join('');

            // Attach click listeners for process modal
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
