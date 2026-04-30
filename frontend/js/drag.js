/**
 * SysScope — Hyprland-style Tiling Window Manager
 * Uses CSS Grid `fr` tracks, requestAnimationFrame for 60fps smooth physics,
 * custom cubic-bezier spring physics, and double-click maximization.
 */

(function() {
    'use strict';

    // --- State ---
    let cols = [1, 1];
    let rows = [1, 1, 1, 1];

    const minFr = 0.2; // Minimum panel size in fr units

    let activeResizer = null;
    let startPos = 0;
    let startFractions = [];
    let rAF = null;

    const els = {
        dashboard: document.getElementById('dashboard'),
        panels: document.querySelectorAll('.panel')
    };

    if (!els.dashboard) return;

    // --- Load/Save Layout ---
    function loadLayout() {
        try {
            const saved = localStorage.getItem('sysscope-layout');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.cols && parsed.cols.length === 2) cols = parsed.cols;
                if (parsed.rows && parsed.rows.length === 4) rows = parsed.rows;
            }
        } catch (e) { console.error('Failed to load layout'); }
        applyGrid();
    }

    function saveLayout() {
        localStorage.setItem('sysscope-layout', JSON.stringify({ cols, rows }));
    }

    function applyGrid() {
        els.dashboard.style.setProperty('--grid-cols', cols.map(c => `${c}fr`).join(' '));
        els.dashboard.style.setProperty('--grid-rows', rows.map(r => `${r}fr`).join(' '));
    }

    // --- Handle Injection & Positioning ---
    function injectHandles() {
        // 1 Vertical handle (between col 0 and 1)
        createHandle('x', 0);
        
        // 3 Horizontal handles (between rows 0-1, 1-2, 2-3)
        createHandle('y', 0);
        createHandle('y', 1);
        createHandle('y', 2);
        
        positionHandles();
        window.addEventListener('resize', positionHandles);
    }

    function createHandle(dir, index) {
        const handle = document.createElement('div');
        handle.className = `resizer-${dir}`;
        handle.dataset.dir = dir;
        handle.dataset.index = index;
        
        const line = document.createElement('div');
        line.className = 'resizer-line';
        handle.appendChild(line);

        els.dashboard.appendChild(handle);

        handle.addEventListener('mousedown', (e) => startDrag(e, handle, dir, index));
    }

    function positionHandles() {
        const rect = els.dashboard.getBoundingClientRect();
        
        // Calculate col boundaries
        let totalColFr = cols.reduce((a, b) => a + b, 0);
        let colPx = cols[0] / totalColFr * rect.width;
        
        // Calculate row boundaries
        let totalRowFr = rows.reduce((a, b) => a + b, 0);
        let rowPx = [];
        let acc = 0;
        for (let i=0; i<3; i++) {
            acc += rows[i] / totalRowFr * rect.height;
            rowPx.push(acc);
        }

        const handles = document.querySelectorAll('.resizer-x, .resizer-y');
        handles.forEach(h => {
            const dir = h.dataset.dir;
            const idx = parseInt(h.dataset.index, 10);
            
            if (dir === 'x') {
                h.style.transform = `translate3d(${colPx - 4}px, 0, 0)`;
                h.style.top = '0';
                h.style.bottom = '0';
            } else {
                h.style.transform = `translate3d(0, ${rowPx[idx] - 4}px, 0)`;
                h.style.left = '0';
                h.style.right = '0';
            }
        });
    }

    // --- Drag Logic ---
    function startDrag(e, handle, dir, index) {
        e.preventDefault();
        activeResizer = { handle, dir, index };
        
        startPos = dir === 'x' ? e.clientX : e.clientY;
        startFractions = dir === 'x' ? [...cols] : [...rows];

        handle.classList.add('active');
        document.body.style.cursor = dir === 'x' ? 'col-resize' : 'row-resize';
        els.panels.forEach(p => p.classList.add('dragging-mode'));

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
    }

    function onDrag(e) {
        if (!activeResizer) return;
        
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
            const { dir, index } = activeResizer;
            const rect = els.dashboard.getBoundingClientRect();
            
            const currentPos = dir === 'x' ? e.clientX : e.clientY;
            const deltaPx = currentPos - startPos;
            
            const totalPx = dir === 'x' ? rect.width : rect.height;
            const totalFr = startFractions.reduce((a, b) => a + b, 0);
            
            const deltaFr = (deltaPx / totalPx) * totalFr;
            
            let arr = dir === 'x' ? cols : rows;
            let frBefore = startFractions[index] + deltaFr;
            let frAfter = startFractions[index + 1] - deltaFr;
            
            if (frBefore < minFr) {
                frAfter -= (minFr - frBefore);
                frBefore = minFr;
            } else if (frAfter < minFr) {
                frBefore -= (minFr - frAfter);
                frAfter = minFr;
            }

            arr[index] = frBefore;
            arr[index + 1] = frAfter;

            applyGrid();
            positionHandles();
        });
    }

    function endDrag() {
        if (!activeResizer) return;
        
        activeResizer.handle.classList.remove('active');
        activeResizer = null;
        document.body.style.cursor = '';
        
        els.panels.forEach(p => p.classList.remove('dragging-mode'));
        
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        
        // Snap to 0.1 fr clean units
        cols = cols.map(c => Math.round(c * 10) / 10);
        rows = rows.map(r => Math.round(r * 10) / 10);
        applyGrid();
        positionHandles();
        saveLayout();
    }

    // --- Fullscreen Double-Click ---
    function initFullscreen() {
        els.panels.forEach(panel => {
            const header = panel.querySelector('.panel-header');
            if (!header) return;

            header.addEventListener('dblclick', () => {
                const isFullscreen = panel.classList.contains('fullscreen');
                
                els.panels.forEach(p => {
                    p.classList.remove('fullscreen');
                    p.style.zIndex = '';
                });

                if (!isFullscreen) {
                    panel.classList.add('fullscreen');
                    panel.style.zIndex = '500';
                }
            });
        });
    }

    // --- Auto Collapse via ResizeObserver ---
    function initCollapseObserver() {
        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const { width, height } = entry.contentRect;
                if (width < 320 || height < 160) {
                    entry.target.classList.add('collapsed');
                } else {
                    entry.target.classList.remove('collapsed');
                }
            });
        });

        els.panels.forEach(panel => observer.observe(panel));
    }

    // --- Init ---
    function init() {
        loadLayout();
        injectHandles();
        initFullscreen();
        initCollapseObserver();
    }

    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
