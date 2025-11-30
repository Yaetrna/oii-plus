/**
 * osu! Improvement Indicator Plus - Content Script
 * 
 * This script runs on osu.ppy.sh/users/* pages and injects the II value
 * into the player's profile statistics.
 * 
 * Updated to work with the current osu! website structure (2024+)
 */

// ============================================================
// BROWSER API COMPATIBILITY
// ============================================================

const browserAPI = (() => {
    if (typeof browser !== 'undefined' && browser.runtime) {
        return browser;
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome;
    }
    return null;
})();

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    // Coefficient formulas for each game mode
    coefficients: {
        osu: { a: -4.49, b: 0.0601, c: 9.66e-6 },
        taiko: { a: -0.159, b: 8.91e-3, c: 3.29e-6 },
        mania: { a: 0.227, b: 0.0306, c: 1.07e-6 },
        fruits: { a: -4.63, b: 0.0564, c: 2.11e-6 }
    },
    elementIds: {
        iiElement: 'oii-improvement-indicator'
    }
};

// ============================================================
// CORE CALCULATION FUNCTIONS
// ============================================================

function calculateExpectedPlaytime(pp, mode) {
    const coef = CONFIG.coefficients[mode] || CONFIG.coefficients.osu;
    return coef.a + coef.b * pp + coef.c * Math.pow(pp, 2);
}

function calculateII(pp, playtimeHours, mode) {
    if (playtimeHours <= 0 || pp <= 0) return 0;
    return calculateExpectedPlaytime(pp, mode) / playtimeHours;
}

function predictPlaytimeForGoal(currentPP, goalPP, currentPlaytimeHours, mode) {
    if (currentPlaytimeHours <= 0 || currentPP <= 0) return Infinity;
    const currentII = calculateII(currentPP, currentPlaytimeHours, mode);
    const expectedPlaytimeForGoal = calculateExpectedPlaytime(goalPP, mode);
    return expectedPlaytimeForGoal / currentII;
}

function getIIColor(ii) {
    if (ii <= 0) return '#888888';
    if (ii >= 2) return 'hsl(120, 100%, 45%)';
    if (ii >= 1) {
        const ratio = (ii - 1) / 1;
        return `hsl(${60 + ratio * 60}, 100%, ${50 - ratio * 5}%)`;
    }
    return `hsl(${ii * 60}, 100%, 50%)`;
}

function formatPlaytime(hours) {
    if (!isFinite(hours) || hours < 0) return '∞';
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    const minutes = Math.floor((hours % 1) * 60);
    let result = '';
    if (days > 0) result += `${days}d `;
    if (remainingHours > 0 || days > 0) result += `${remainingHours}h `;
    if (minutes > 0 && days === 0) result += `${minutes}m`;
    return result.trim() || '0h';
}

// ============================================================
// DATA EXTRACTION - Multiple methods for reliability
// ============================================================

/**
 * Get current game mode from URL or page
 */
function getCurrentMode() {
    const urlMatch = window.location.pathname.match(/\/users\/\d+\/(osu|taiko|fruits|mania)/);
    if (urlMatch) return urlMatch[1];
    return 'osu';
}

/**
 * Try to get data from various page sources
 */
function getDataFromPage() {
    // Method 1: Look for data-initial-data attribute (React data)
    const elements = document.querySelectorAll('[data-initial-data]');
    for (const el of elements) {
        try {
            const data = JSON.parse(el.getAttribute('data-initial-data'));
            if (data?.user?.statistics) {
                console.log('[oii+] Found data via data-initial-data');
                return {
                    pp: data.user.statistics.pp,
                    playTimeSeconds: data.user.statistics.play_time,
                    username: data.user.username,
                    mode: data.current_mode || getCurrentMode()
                };
            }
        } catch (e) {}
    }
    
    // Method 2: Look for JSON in script tags
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        try {
            const content = script.textContent || '';
            if (content.includes('"statistics"') && content.includes('"play_time"')) {
                // Try to extract just the user data part
                const userMatch = content.match(/"user"\s*:\s*(\{[^}]+\})/);
                if (userMatch) {
                    // This is tricky, let's try a different approach
                }
            }
        } catch (e) {}
    }
    
    // Method 3: Parse visible values from the page
    console.log('[oii+] Trying to parse from visible page content...');
    return parseFromVisibleContent();
}

/**
 * Parse data from visible page content (fallback)
 */
function parseFromVisibleContent() {
    let pp = null;
    let playTimeSeconds = null;
    let username = null;
    
    // Get username from page title
    const titleMatch = document.title.match(/^(.+?)\s*[·|\-]/);
    if (titleMatch) {
        username = titleMatch[1].trim();
    }
    
    // Get all text content
    const pageText = document.body.innerText;
    
    // Look for PP value - pattern: "pp" near a number like "9,109"
    // On osu! profiles, PP is displayed prominently
    const ppMatch = pageText.match(/pp\s*([0-9,]+)|([0-9,]+)\s*pp/i);
    if (ppMatch) {
        const ppStr = ppMatch[1] || ppMatch[2];
        pp = parseInt(ppStr.replace(/,/g, ''));
        console.log('[oii+] Found PP:', pp);
    }
    
    // Look for play time - format "XXd XXh XXm"
    const timeMatch = pageText.match(/(\d+)d\s*(\d+)h\s*(\d+)m/);
    if (timeMatch) {
        const days = parseInt(timeMatch[1]) || 0;
        const hours = parseInt(timeMatch[2]) || 0;
        const minutes = parseInt(timeMatch[3]) || 0;
        playTimeSeconds = (days * 24 * 3600) + (hours * 3600) + (minutes * 60);
        console.log('[oii+] Found playtime:', days, 'd', hours, 'h', minutes, 'm');
    }
    
    if (pp && pp > 0 && playTimeSeconds && playTimeSeconds > 0) {
        return {
            pp,
            playTimeSeconds,
            username: username || 'Unknown',
            mode: getCurrentMode()
        };
    }
    
    return null;
}

// ============================================================
// UI INJECTION
// ============================================================

function addStyles() {
    if (document.getElementById('oii-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'oii-styles';
    style.textContent = `
        /* Expand grid to 5 columns: Medals(1) + pp(1) + Total Play Time(2) + ii(1) = 5 */
        .profile-detail__values--grid {
            grid-template-columns: repeat(5, 1fr) !important;
        }
        .profile-detail__values {
            gap: 15px;
        }
        #oii-improvement-indicator {
            position: relative;
        }
        #oii-improvement-indicator .value-display__value {
            transition: all 0.2s ease;
        }
        #oii-improvement-indicator:hover .value-display__value {
            filter: brightness(1.2);
        }
        /* Custom tooltip */
        .oii-tooltip {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: hsl(var(--hsl-b2, 260 10% 15%));
            border: 1px solid hsl(var(--hsl-b4, 260 10% 30%));
            border-radius: 6px;
            padding: 10px 12px;
            width: max-content;
            max-width: 250px;
            z-index: 1000;
            transition: opacity 0.2s, visibility 0.2s;
            pointer-events: none;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .oii-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: hsl(var(--hsl-b4, 260 10% 30%));
        }
        #oii-improvement-indicator:hover .oii-tooltip {
            visibility: visible;
            opacity: 1;
        }
        .oii-tooltip__title {
            font-weight: bold;
            font-size: 13px;
            color: hsl(var(--hsl-c1, 0 0% 100%));
            margin-bottom: 6px;
        }
        .oii-tooltip__desc {
            font-size: 11px;
            color: hsl(var(--hsl-c2, 0 0% 70%));
            margin-bottom: 8px;
        }
        .oii-tooltip__legend {
            font-size: 11px;
            color: hsl(var(--hsl-c2, 0 0% 70%));
            line-height: 1.6;
        }
        .oii-tooltip__legend-item {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .oii-tooltip__legend-icon--up { color: #60f000; }
        .oii-tooltip__legend-icon--mid { color: #f0c000; }
        .oii-tooltip__legend-icon--down { color: #f04000; }
    `;
    document.head.appendChild(style);
}

function createIIElement(ii, pp, playtimeHours) {
    // Match the exact structure used by osu! website
    const container = document.createElement('div');
    container.id = CONFIG.elementIds.iiElement;
    container.className = 'value-display value-display--plain';
    
    const iiValue = ii > 0 && pp > 0 && playtimeHours > 0 ? ii.toFixed(2) + 'x' : '-';
    const color = getIIColor(ii);
    
    // Label div
    const labelDiv = document.createElement('div');
    labelDiv.className = 'value-display__label';
    labelDiv.textContent = 'ii';
    
    // Value div
    const valueDiv = document.createElement('div');
    valueDiv.className = 'value-display__value';
    valueDiv.style.color = color;
    valueDiv.style.textShadow = `0 0 10px ${color}`;
    valueDiv.style.cursor = 'help';
    valueDiv.textContent = iiValue;
    
    // Custom tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'oii-tooltip';
    tooltip.innerHTML = `
        <div class="oii-tooltip__title">Improvement Indicator</div>
        <div class="oii-tooltip__desc">Compares your improvement speed to the average player.</div>
        <div class="oii-tooltip__legend">
            <div class="oii-tooltip__legend-item"><span class="oii-tooltip__legend-icon--up">▲</span> Above 1.0x → Faster</div>
            <div class="oii-tooltip__legend-item"><span class="oii-tooltip__legend-icon--mid">●</span> Equal 1.0x → Average</div>
            <div class="oii-tooltip__legend-item"><span class="oii-tooltip__legend-icon--down">▼</span> Below 1.0x → Slower</div>
        </div>
    `;
    
    container.appendChild(labelDiv);
    container.appendChild(valueDiv);
    container.appendChild(tooltip);
    
    return container;
}

function findInjectionPoint() {
    // Target the grid with Medals, pp, Total Play Time
    const gridSelector = '.profile-detail__values--grid';
    const grid = document.querySelector(gridSelector);
    
    if (grid) {
        console.log('[oii+] Found injection point:', gridSelector);
        return { element: grid, position: 'append' };
    }
    
    // Fallback selectors
    const fallbacks = ['.profile-detail__values', '.profile-detail'];
    for (const selector of fallbacks) {
        const el = document.querySelector(selector);
        if (el) {
            console.log('[oii+] Found fallback injection point:', selector);
            return { element: el, position: 'append' };
        }
    }
    
    return null;
}

// ============================================================
// MAIN INJECTION LOGIC
// ============================================================

let currentUserData = null;

async function injectII(additionalPlaytimeHours = 0) {
    console.log('[oii+] Starting injection...');
    
    // Add styles first
    addStyles();
    
    // Remove existing element
    const existing = document.getElementById(CONFIG.elementIds.iiElement);
    if (existing) existing.remove();
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get user data
    let userData = getDataFromPage();
    
    if (!userData) {
        console.log('[oii+] Data not found, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        userData = getDataFromPage();
    }
    
    if (!userData) {
        console.warn('[oii+] Could not extract user data');
        return;
    }
    
    // Calculate
    const playtimeHours = (userData.playTimeSeconds / 3600) + additionalPlaytimeHours;
    const ii = calculateII(userData.pp, playtimeHours, userData.mode);
    
    console.log(`[oii+] User: ${userData.username}`);
    console.log(`[oii+] PP: ${userData.pp}, Playtime: ${playtimeHours.toFixed(1)}h`);
    console.log(`[oii+] II: ${ii.toFixed(3)}`);
    
    // Store for popup
    currentUserData = {
        ...userData,
        playtimeHours: userData.playTimeSeconds / 3600,
        additionalPlaytimeHours,
        ii
    };
    
    // Create element
    const iiElement = createIIElement(ii, userData.pp, playtimeHours);
    
    // Find injection point
    const injection = findInjectionPoint();
    
    if (injection) {
        injection.element.appendChild(iiElement);
        console.log('[oii+] Injected successfully!');
    } else {
        // Floating fallback
        console.log('[oii+] Using floating position');
        iiElement.classList.add('oii-floating');
        document.body.appendChild(iiElement);
    }
}

// ============================================================
// MESSAGE HANDLING
// ============================================================

if (browserAPI?.runtime) {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[oii+] Message:', request);
        
        if (request.type === 'UPDATE_PLAYTIME') {
            injectII(Number(request.additionalPlaytimeHours));
            sendResponse({ success: true });
        }
        
        if (request.type === 'GET_PREDICTION' && currentUserData) {
            const playtimeHours = currentUserData.playtimeHours + (request.additionalPlaytimeHours || 0);
            sendResponse({
                success: true,
                prediction: predictPlaytimeForGoal(currentUserData.pp, Number(request.goalPP), playtimeHours, currentUserData.mode),
                currentII: calculateII(currentUserData.pp, playtimeHours, currentUserData.mode)
            });
        }
        
        if (request.type === 'GET_CURRENT_DATA') {
            sendResponse(currentUserData 
                ? { success: true, data: { username: currentUserData.username, pp: currentUserData.pp, playtimeHours: currentUserData.playtimeHours, mode: currentUserData.mode, ii: currentUserData.ii } }
                : { success: false, error: 'No data' }
            );
        }
        
        return true;
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
    if (!/\/users\/\d+/.test(location.href)) return;
    console.log('[oii+] Initializing...');
    injectII(0);
}

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle navigation
document.addEventListener('turbo:load', () => {
    if (/\/users\/\d+/.test(location.href)) {
        console.log('[oii+] Turbo navigation');
        setTimeout(() => injectII(0), 500);
    }
});

// Watch URL changes
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (/\/users\/\d+/.test(location.href)) {
            console.log('[oii+] URL changed');
            setTimeout(() => injectII(0), 1000);
        }
    }
}).observe(document.body, { childList: true, subtree: true });
