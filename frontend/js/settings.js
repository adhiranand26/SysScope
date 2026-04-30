/**
 * SysScope — Settings Sidebar & Customization Logic
 */

const DEFAULTS = {
    theme: 'default',
    accent: '#e8a020',
    bg: '#1a1a1a',
    alpha: 1.0,
    blur: 0
};

const THEMES = {
    default: { accent: '#e8a020', bg: '#1a1a1a' },
    catppuccin: { accent: '#cba6f7', bg: '#1e1e2e' },
    nord: { accent: '#88c0d0', bg: '#2e3440' },
    gruvbox: { accent: '#fe8019', bg: '#282828' },
    tokyonight: { accent: '#7aa2f7', bg: '#1a1b26' }
};

let currentSettings = { ...DEFAULTS };

function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 26, g: 26, b: 26 };
}

function lightenRgb(rgb, amount) {
    return {
        r: Math.min(255, rgb.r + amount),
        g: Math.min(255, rgb.g + amount),
        b: Math.min(255, rgb.b + amount)
    };
}

function applySettings() {
    const root = document.documentElement;

    root.style.setProperty('--accent', currentSettings.accent);
    root.style.setProperty('--bg-base', currentSettings.bg);
    
    const baseRgb = hexToRgb(currentSettings.bg);
    const surfaceRgb = lightenRgb(baseRgb, 8);
    const elevatedRgb = lightenRgb(baseRgb, 11);
    const hoverRgb = lightenRgb(baseRgb, 16);

    root.style.setProperty('--bg-surface-rgb', `${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}`);
    root.style.setProperty('--bg-elevated-rgb', `${elevatedRgb.r}, ${elevatedRgb.g}, ${elevatedRgb.b}`);
    root.style.setProperty('--bg-hover-rgb', `${hoverRgb.r}, ${hoverRgb.g}, ${hoverRgb.b}`);
    root.style.setProperty('--panel-alpha', currentSettings.alpha);
    root.style.setProperty('--panel-blur', `${currentSettings.blur}px`);

    localStorage.setItem('sysscope-settings', JSON.stringify(currentSettings));

    // Update UI if present
    const colorAccent = document.getElementById('color-accent');
    if (colorAccent) {
        colorAccent.value = currentSettings.accent;
        document.getElementById('val-accent').textContent = currentSettings.accent.toUpperCase();
        document.getElementById('color-bg').value = currentSettings.bg;
        document.getElementById('val-bg').textContent = currentSettings.bg.toUpperCase();
        document.getElementById('range-alpha').value = currentSettings.alpha;
        document.getElementById('val-alpha').textContent = `${Math.round(currentSettings.alpha * 100)}%`;
        document.getElementById('range-blur').value = currentSettings.blur;
        document.getElementById('val-blur').textContent = `${currentSettings.blur}px`;

        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active-theme'));
        const activeBtn = document.querySelector(`.theme-btn[data-theme="${currentSettings.theme}"]`);
        if (activeBtn) activeBtn.classList.add('active-theme');
    }
}

function bindSettingsEvents() {
    document.getElementById('btn-settings-toggle')?.addEventListener('click', () => {
        document.getElementById('settings-sidebar').classList.add('open');
    });

    document.getElementById('btn-settings-close')?.addEventListener('click', () => {
        document.getElementById('settings-sidebar').classList.remove('open');
    });

    document.getElementById('color-accent')?.addEventListener('input', (e) => {
        currentSettings.accent = e.target.value;
        currentSettings.theme = 'custom';
        applySettings();
    });

    document.getElementById('color-bg')?.addEventListener('input', (e) => {
        currentSettings.bg = e.target.value;
        currentSettings.theme = 'custom';
        applySettings();
    });

    document.getElementById('range-alpha')?.addEventListener('input', (e) => {
        currentSettings.alpha = parseFloat(e.target.value);
        applySettings();
    });

    document.getElementById('range-blur')?.addEventListener('input', (e) => {
        currentSettings.blur = parseInt(e.target.value, 10);
        applySettings();
    });

    document.getElementById('theme-grid')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-btn')) {
            const themeName = e.target.dataset.theme;
            const themeColors = THEMES[themeName];
            if (themeColors) {
                currentSettings.theme = themeName;
                currentSettings.accent = themeColors.accent;
                currentSettings.bg = themeColors.bg;
                applySettings();
            }
        }
    });

    document.getElementById('btn-reset-settings')?.addEventListener('click', () => {
        currentSettings = { ...DEFAULTS };
        applySettings();
    });
}

function injectUI() {
    // Avoid double injection
    if (document.getElementById('settings-sidebar')) return;

    try {
        const saved = localStorage.getItem('sysscope-settings');
        if (saved) {
            currentSettings = { ...DEFAULTS, ...JSON.parse(saved) };
        }
    } catch (e) { console.error(e); }

    const topbarContainer = document.getElementById('score-badge')?.parentNode;
    if (topbarContainer && !document.getElementById('btn-settings-toggle')) {
        const btn = document.createElement('button');
        btn.id = 'btn-settings-toggle';
        btn.title = 'Settings';
        btn.textContent = '⚙️';
        topbarContainer.appendChild(btn);
    }

    const sidebar = document.createElement('aside');
    sidebar.id = 'settings-sidebar';
    sidebar.innerHTML = `
        <div class="settings-header">
            <h2>┤ Customize ├</h2>
            <button class="btn-close" id="btn-settings-close" style="margin-top:0">✕</button>
        </div>
        <div class="settings-body">
            <div class="settings-group">
                <h3>Colors</h3>
                <div class="settings-control">
                    <label>Accent Color <span class="val-display" id="val-accent"></span></label>
                    <input type="color" id="color-accent">
                </div>
                <div class="settings-control">
                    <label>Background Base <span class="val-display" id="val-bg"></span></label>
                    <input type="color" id="color-bg">
                </div>
            </div>
            
            <div class="settings-group">
                <h3>Glassmorphism</h3>
                <div class="settings-control">
                    <label>Panel Opacity <span class="val-display" id="val-alpha"></span></label>
                    <input type="range" id="range-alpha" min="0" max="1" step="0.01">
                </div>
                <div class="settings-control">
                    <label>Panel Blur <span class="val-display" id="val-blur"></span></label>
                    <input type="range" id="range-blur" min="0" max="20" step="1">
                </div>
            </div>
            
            <div class="settings-group">
                <h3>Presets</h3>
                <div class="theme-grid" id="theme-grid">
                    <button class="theme-btn" data-theme="default">Default (btop)</button>
                    <button class="theme-btn" data-theme="catppuccin">Catppuccin</button>
                    <button class="theme-btn" data-theme="nord">Nord</button>
                    <button class="theme-btn" data-theme="gruvbox">Gruvbox</button>
                    <button class="theme-btn" data-theme="tokyonight">Tokyo Night</button>
                </div>
            </div>
        </div>
        <div class="settings-footer">
            <button class="btn-full" id="btn-reset-settings">Reset to Default</button>
        </div>
    `;
    document.body.appendChild(sidebar);

    applySettings();
    bindSettingsEvents();
}

document.addEventListener('DOMContentLoaded', injectUI);
injectUI();
