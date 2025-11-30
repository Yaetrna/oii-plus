/**
 * osu! Improvement Indicator Plus - Content Script
 * 
 * This script runs on osu.ppy.sh/users/* pages and injects the II value
 * into the player's profile statistics.
 * 
 * Updated with ML-trained coefficients based on 250K+ player dataset.
 * Uses Total Hits as primary predictor (98% R²) with PP fallback (64% R²).
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
// CONFIGURATION - ML-Trained Coefficients
// ============================================================

const CONFIG = {
    // ML-trained coefficients based on 250K+ players
    // Primary model: Power Law using Total Hits (R² = 0.98)
    // Formula: expected_playtime = a * total_hits^b
    coefficients: {
        osu: {
            // Power Law: playtime = a * total_hits^b (R² = 0.9803)
            totalHits: { a: 0.000545, b: 0.8737 },
            // Fallback Quadratic: playtime = a + b*pp + c*pp² (R² = 0.64)
            pp: { a: -148.83, b: 0.1442, c: -3.83e-7 }
        },
        taiko: {
            // Using osu! coefficients scaled (pending mode-specific data)
            totalHits: { a: 0.000545, b: 0.8737 },
            pp: { a: -0.159, b: 8.91e-3, c: 3.29e-6 }
        },
        fruits: {
            totalHits: { a: 0.000545, b: 0.8737 },
            pp: { a: -4.63, b: 0.0564, c: 2.11e-6 }
        },
        mania: {
            totalHits: { a: 0.000545, b: 0.8737 },
            pp: { a: 0.227, b: 0.0306, c: 1.07e-6 }
        }
    },
    elementIds: {
        iiElement: 'oii-improvement-indicator'
    }
};

// ============================================================
// CORE CALCULATION FUNCTIONS
// ============================================================

/**
 * Calculate expected playtime using Total Hits (primary, most accurate)
 * Uses Power Law: playtime = a * total_hits^b
 */
function calculateExpectedPlaytimeFromHits(totalHits, mode) {
    const coef = CONFIG.coefficients[mode]?.totalHits || CONFIG.coefficients.osu.totalHits;
    return coef.a * Math.pow(totalHits, coef.b);
}

/**
 * Calculate expected playtime using PP (fallback, less accurate)
 * Uses Quadratic: playtime = a + b*pp + c*pp²
 */
function calculateExpectedPlaytimeFromPP(pp, mode) {
    const coef = CONFIG.coefficients[mode]?.pp || CONFIG.coefficients.osu.pp;
    return coef.a + coef.b * pp + coef.c * Math.pow(pp, 2);
}

/**
 * Calculate expected playtime - prefers total_hits, falls back to PP
 */
function calculateExpectedPlaytime(stats, mode) {
    // Use total_hits if available (much more accurate)
    if (stats.totalHits && stats.totalHits > 0) {
        return calculateExpectedPlaytimeFromHits(stats.totalHits, mode);
    }
    // Fallback to PP
    if (stats.pp && stats.pp > 0) {
        return calculateExpectedPlaytimeFromPP(stats.pp, mode);
    }
    return 0;
}

/**
 * Calculate Improvement Indicator
 * II > 1.0 = improving faster than average
 * II < 1.0 = improving slower than average
 */
function calculateII(stats, playtimeHours, mode) {
    if (playtimeHours <= 0) return 0;
    const expected = calculateExpectedPlaytime(stats, mode);
    if (expected <= 0) return 0;
    return expected / playtimeHours;
}

/**
 * Predict playtime needed to reach a PP goal
 */
function predictPlaytimeForGoal(currentStats, goalPP, currentPlaytimeHours, mode) {
    if (currentPlaytimeHours <= 0) return Infinity;
    const currentII = calculateII(currentStats, currentPlaytimeHours, mode);
    if (currentII <= 0) return Infinity;
    
    // Estimate total_hits at goal PP (rough scaling)
    const ppRatio = goalPP / (currentStats.pp || 1);
    const estimatedHitsAtGoal = (currentStats.totalHits || 0) * Math.pow(ppRatio, 1.2);
    
    const expectedPlaytimeForGoal = estimatedHitsAtGoal > 0 
        ? calculateExpectedPlaytimeFromHits(estimatedHitsAtGoal, mode)
        : calculateExpectedPlaytimeFromPP(goalPP, mode);
    
    return expectedPlaytimeForGoal / currentII;
}

/**
 * Get color for II value based on sigma intervals from 250K player distribution:
 * Mean = 1.007, Std = 0.133
 * > 1.20x (> +1.5σ): Bright Green - Top 7%
 * 1.07x - 1.20x (+0.5σ to +1.5σ): Green - Top 31%
 * 0.94x - 1.07x (±0.5σ): Yellow - Middle 38%
 * 0.80x - 0.94x (-0.5σ to -1.5σ): Orange - Bottom 31%
 * < 0.80x (< -1.5σ): Red - Bottom 7%
 */
function getIIColor(ii) {
    if (ii <= 0) return '#888888';
    if (ii >= 1.20) return 'hsl(120, 100%, 45%)';  // Bright green - exceptionally fast
    if (ii >= 1.07) return 'hsl(90, 100%, 50%)';   // Green - above average
    if (ii >= 0.94) return 'hsl(60, 100%, 50%)';   // Yellow - average
    if (ii >= 0.80) return 'hsl(30, 100%, 50%)';   // Orange - below average
    return 'hsl(0, 100%, 50%)';                     // Red - taking your time
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
                const stats = data.user.statistics;
                console.log('[oii+] Found data via data-initial-data');
                return {
                    pp: stats.pp,
                    playTimeSeconds: stats.play_time,
                    totalHits: stats.total_hits || 0,
                    playCount: stats.play_count || 0,
                    accuracy: stats.hit_accuracy || 0,
                    rankedScore: stats.ranked_score || 0,
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
    let totalHits = null;
    let username = null;
    
    // Get username from page title
    const titleMatch = document.title.match(/^(.+?)\s*[·|\-]/);
    if (titleMatch) {
        username = titleMatch[1].trim();
    }
    
    // Get all text content
    const pageText = document.body.innerText;
    
    // Look for PP value - pattern: "pp" near a number like "9,109"
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
    
    // Look for Total Hits - format "Total Hits 13,812,580" or similar
    const hitsMatch = pageText.match(/Total\s*Hits\s*([0-9,]+)/i);
    if (hitsMatch) {
        totalHits = parseInt(hitsMatch[1].replace(/,/g, ''));
        console.log('[oii+] Found total hits:', totalHits);
    }
    
    if (pp && pp > 0 && playTimeSeconds && playTimeSeconds > 0) {
        return {
            pp,
            playTimeSeconds,
            totalHits: totalHits || 0,
            playCount: 0,
            accuracy: 0,
            rankedScore: 0,
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

function createIIElement(ii, stats, playtimeHours) {
    // Match the exact structure used by osu! website
    const container = document.createElement('div');
    container.id = CONFIG.elementIds.iiElement;
    container.className = 'value-display value-display--plain';
    
    const iiValue = ii > 0 && playtimeHours > 0 ? ii.toFixed(2) + 'x' : '-';
    const color = getIIColor(ii);
    
    // Determine which model was used
    const modelUsed = stats.totalHits > 0 ? 'Total Hits (98% accuracy)' : 'PP-based (64% accuracy)';
    
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
    
    // Custom tooltip (built safely without innerHTML)
    const tooltip = document.createElement('div');
    tooltip.className = 'oii-tooltip';
    
    const title = document.createElement('div');
    title.className = 'oii-tooltip__title';
    title.textContent = 'Improvement Indicator';
    
    const desc = document.createElement('div');
    desc.className = 'oii-tooltip__desc';
    desc.textContent = 'Compares your improvement speed to the average player.';
    
    const legend = document.createElement('div');
    legend.className = 'oii-tooltip__legend';
    
    const legendItems = [
        { icon: '▲', iconClass: 'oii-tooltip__legend-icon--up', text: 'Above 1.0x → Faster than average' },
        { icon: '●', iconClass: 'oii-tooltip__legend-icon--mid', text: 'Equal 1.0x → Average' },
        { icon: '▼', iconClass: 'oii-tooltip__legend-icon--down', text: 'Below 1.0x → Slower than average' }
    ];
    
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'oii-tooltip__legend-item';
        const iconSpan = document.createElement('span');
        iconSpan.className = item.iconClass;
        iconSpan.textContent = item.icon;
        legendItem.appendChild(iconSpan);
        legendItem.appendChild(document.createTextNode(' ' + item.text));
        legend.appendChild(legendItem);
    });
    
    const modelDiv = document.createElement('div');
    modelDiv.style.cssText = 'margin-top: 8px; font-size: 10px; opacity: 0.7;';
    modelDiv.textContent = 'Model: ' + modelUsed;
    
    tooltip.appendChild(title);
    tooltip.appendChild(desc);
    tooltip.appendChild(legend);
    tooltip.appendChild(modelDiv);
    
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
let isInjecting = false;  // Prevent concurrent injections

/**
 * Update existing II element without recreating it
 */
function updateIIElement(ii, stats, playtimeHours) {
    const container = document.getElementById(CONFIG.elementIds.iiElement);
    if (!container) return false;
    
    const valueDiv = container.querySelector('.value-display__value');
    if (!valueDiv) return false;
    
    const iiValue = ii > 0 && playtimeHours > 0 ? ii.toFixed(2) + 'x' : '-';
    const color = getIIColor(ii);
    
    valueDiv.textContent = iiValue;
    valueDiv.style.color = color;
    valueDiv.style.textShadow = `0 0 10px ${color}`;
    
    console.log(`[oii+] Updated II to ${iiValue}`);
    return true;
}

async function injectII(additionalPlaytimeHours = 0, forceRecreate = false) {
    // Prevent concurrent injections
    if (isInjecting) {
        console.log('[oii+] Injection already in progress, skipping...');
        return;
    }
    
    console.log('[oii+] Starting injection...');
    
    // Add styles first
    addStyles();
    
    // If we already have data and element exists, just update it
    if (!forceRecreate && currentUserData && document.getElementById(CONFIG.elementIds.iiElement)) {
        const playtimeHours = currentUserData.playtimeHours + additionalPlaytimeHours;
        const stats = {
            pp: currentUserData.pp,
            totalHits: currentUserData.totalHits || 0
        };
        const ii = calculateII(stats, playtimeHours, currentUserData.mode);
        
        currentUserData.additionalPlaytimeHours = additionalPlaytimeHours;
        currentUserData.ii = ii;
        
        if (updateIIElement(ii, stats, playtimeHours)) {
            return;
        }
    }
    
    isInjecting = true;
    
    try {
        // Remove ALL existing II elements (cleanup duplicates)
        document.querySelectorAll('#' + CONFIG.elementIds.iiElement).forEach(el => el.remove());
        
        // Wait for page to load (only on first injection)
        if (!currentUserData) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
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
        const stats = {
            pp: userData.pp,
            totalHits: userData.totalHits || 0
        };
        const ii = calculateII(stats, playtimeHours, userData.mode);
        
        console.log(`[oii+] User: ${userData.username}`);
        console.log(`[oii+] PP: ${userData.pp}, Total Hits: ${userData.totalHits || 'N/A'}, Playtime: ${playtimeHours.toFixed(1)}h`);
        console.log(`[oii+] II: ${ii.toFixed(3)} (using ${userData.totalHits > 0 ? 'Total Hits model' : 'PP model'})`);
        
        // Store for popup
        currentUserData = {
            ...userData,
            playtimeHours: userData.playTimeSeconds / 3600,
            additionalPlaytimeHours,
            ii
        };
        
        // Remove any elements that might have been added during async operations
        document.querySelectorAll('#' + CONFIG.elementIds.iiElement).forEach(el => el.remove());
        
        // Create element
        const iiElement = createIIElement(ii, stats, playtimeHours);
        
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
    } finally {
        isInjecting = false;
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
            const stats = {
                pp: currentUserData.pp,
                totalHits: currentUserData.totalHits || 0
            };
            sendResponse({
                success: true,
                prediction: predictPlaytimeForGoal(stats, Number(request.goalPP), playtimeHours, currentUserData.mode),
                currentII: calculateII(stats, playtimeHours, currentUserData.mode)
            });
        }
        
        if (request.type === 'GET_CURRENT_DATA') {
            sendResponse(currentUserData 
                ? { 
                    success: true, 
                    data: { 
                        username: currentUserData.username, 
                        pp: currentUserData.pp, 
                        totalHits: currentUserData.totalHits || 0,
                        playtimeHours: currentUserData.playtimeHours, 
                        mode: currentUserData.mode, 
                        ii: currentUserData.ii,
                        modelUsed: currentUserData.totalHits > 0 ? 'totalHits' : 'pp'
                    } 
                }
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
