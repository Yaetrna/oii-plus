/**
 * osu! Improvement Indicator Plus - Popup Script
 * 
 * This script handles the popup UI logic and communicates with the content script.
 * Supports both Chrome (chrome.*) and Firefox (browser.*) APIs.
 */

// ============================================================
// BROWSER API COMPATIBILITY
// ============================================================

/**
 * Cross-browser API wrapper.
 * Firefox uses 'browser' (Promise-based), Chrome uses 'chrome' (callback-based).
 */
const browserAPI = (() => {
    if (typeof browser !== 'undefined' && browser.runtime) {
        return browser; // Firefox - already Promise-based
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome;  // Chrome/Edge/Brave
    }
    return null;
})();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format hours into a readable string.
 * @param {number} hours - Number of hours
 * @returns {string} Formatted time string
 */
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

/**
 * Format game mode name.
 * @param {string} mode - Game mode key
 * @returns {string} Formatted mode name
 */
function formatGameMode(mode) {
    const modes = {
        osu: 'osu!standard',
        taiko: 'osu!taiko',
        fruits: 'osu!catch',
        mania: 'osu!mania'
    };
    return modes[mode] || mode;
}

/**
 * Get color for II value.
 * @param {number} ii - Improvement Indicator value
 * @returns {string} CSS color string
 */
function getIIColor(ii) {
    if (ii <= 0) return '#888888';
    
    if (ii >= 2) {
        return 'hsl(120, 100%, 45%)';
    } else if (ii >= 1) {
        const ratio = (ii - 1) / 1;
        const hue = 60 + ratio * 60;
        return `hsl(${hue}, 100%, ${50 - ratio * 5}%)`;
    } else {
        const hue = ii * 60;
        return `hsl(${hue}, 100%, 50%)`;
    }
}

/**
 * Send a message to the content script in the active tab.
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} Response from content script
 */
async function sendToContentScript(message) {
    try {
        if (!browserAPI) {
            return { success: false, error: 'Browser API not available' };
        }
        
        const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url || !tab.url.includes('osu.ppy.sh/users/')) {
            return { success: false, error: 'Not on an osu! profile page' };
        }
        
        return await browserAPI.tabs.sendMessage(tab.id, message);
    } catch (error) {
        console.error('[oii+] Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================

/**
 * Update the stats display with player data.
 * @param {Object} data - Player data from content script
 */
function updateStatsDisplay(data) {
    document.getElementById('playerName').textContent = data.username || '-';
    document.getElementById('gameMode').textContent = formatGameMode(data.mode);
    document.getElementById('currentPP').textContent = data.pp ? `${Math.round(data.pp).toLocaleString()}pp` : '-';
    document.getElementById('currentPlaytime').textContent = data.playtimeHours ? formatPlaytime(data.playtimeHours) : '-';
    
    const iiElement = document.getElementById('currentII');
    if (data.ii && data.ii > 0) {
        iiElement.textContent = `${data.ii.toFixed(2)}x`;
        iiElement.style.color = getIIColor(data.ii);
    } else {
        iiElement.textContent = '-';
        iiElement.style.color = '';
    }
}

/**
 * Show the "not on profile" message.
 */
function showNotOnProfile() {
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('calculatorSection').style.display = 'none';
    document.getElementById('notOnProfile').style.display = 'block';
}

/**
 * Show the main stats view.
 */
function showStatsView() {
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('calculatorSection').style.display = 'block';
    document.getElementById('notOnProfile').style.display = 'none';
}

/**
 * Show a result in the adjusted II display.
 * @param {string} text - Text to display
 * @param {string} className - CSS class for styling
 */
function showAdjustedII(text, className = '') {
    const element = document.getElementById('adjustedII');
    element.textContent = text;
    element.className = 'input-result visible ' + className;
}

/**
 * Show a result in the prediction display.
 * @param {string} text - Text to display
 * @param {string} className - CSS class for styling
 */
function showPrediction(text, className = '') {
    const element = document.getElementById('predictionResult');
    element.textContent = text;
    element.className = 'input-result visible ' + className;
}

/**
 * Hide the adjusted II display.
 */
function hideAdjustedII() {
    document.getElementById('adjustedII').className = 'input-result';
}

/**
 * Hide the prediction display.
 */
function hidePrediction() {
    document.getElementById('predictionResult').className = 'input-result';
}

// ============================================================
// EVENT HANDLERS
// ============================================================

/**
 * Handle additional playtime input change.
 */
async function handleAdditionalPlaytimeChange(event) {
    const additionalHours = parseFloat(event.target.value) || 0;
    
    if (additionalHours < 0) {
        event.target.value = 0;
        return;
    }
    
    if (additionalHours === 0) {
        hideAdjustedII();
        return;
    }
    
    // Send to content script to recalculate
    const response = await sendToContentScript({
        type: 'UPDATE_PLAYTIME',
        additionalPlaytimeHours: additionalHours
    });
    
    if (response.success) {
        // Also update our display
        const dataResponse = await sendToContentScript({ type: 'GET_CURRENT_DATA' });
        if (dataResponse.success && dataResponse.data) {
            // Calculate adjusted II
            const adjustedPlaytime = dataResponse.data.playtimeHours + additionalHours;
            const coefficients = {
                osu: { a: -4.49, b: 0.0601, c: 9.66e-6 },
                taiko: { a: -0.159, b: 8.91e-3, c: 3.29e-6 },
                mania: { a: 0.227, b: 0.0306, c: 1.07e-6 },
                fruits: { a: -4.63, b: 0.0564, c: 2.11e-6 }
            };
            
            const coef = coefficients[dataResponse.data.mode] || coefficients.osu;
            const pp = dataResponse.data.pp;
            const expectedPlaytime = coef.a + coef.b * pp + coef.c * Math.pow(pp, 2);
            const adjustedII = expectedPlaytime / adjustedPlaytime;
            
            showAdjustedII(
                `Adjusted II: ${adjustedII.toFixed(2)}x (with +${additionalHours}h)`,
                'highlight'
            );
        }
    }
}

/**
 * Handle goal PP input change.
 */
async function handleGoalPPChange(event) {
    const goalPP = parseFloat(event.target.value) || 0;
    const additionalHours = parseFloat(document.getElementById('additionalPlaytime').value) || 0;
    
    if (goalPP <= 0) {
        hidePrediction();
        return;
    }
    
    const response = await sendToContentScript({
        type: 'GET_PREDICTION',
        goalPP: goalPP,
        additionalPlaytimeHours: additionalHours
    });
    
    if (response.success) {
        const remaining = response.prediction;
        const currentData = await sendToContentScript({ type: 'GET_CURRENT_DATA' });
        const currentPlaytime = currentData.success ? currentData.data.playtimeHours + additionalHours : 0;
        const additionalNeeded = Math.max(0, remaining - currentPlaytime);
        
        if (additionalNeeded <= 0) {
            showPrediction(
                `🎉 You should already be at ${goalPP}pp based on your improvement rate!`,
                'success'
            );
        } else {
            showPrediction(
                `📊 Estimated time to reach ${goalPP.toLocaleString()}pp: ${formatPlaytime(remaining)} total (${formatPlaytime(additionalNeeded)} more)`,
                'highlight'
            );
        }
    } else {
        showPrediction('Could not calculate prediction', '');
    }
}

/**
 * Handle input with debounce.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize the popup when the DOM is ready.
 */
async function init() {
    console.log('[oii+] Popup initialized');
    
    // Try to get current data from the content script
    const response = await sendToContentScript({ type: 'GET_CURRENT_DATA' });
    
    if (response.success && response.data) {
        showStatsView();
        updateStatsDisplay(response.data);
    } else {
        showNotOnProfile();
    }
    
    // Set up event listeners with debounce
    const additionalPlaytimeInput = document.getElementById('additionalPlaytime');
    const goalPPInput = document.getElementById('goalPP');
    
    // Use both 'input' for immediate feedback and 'change' for final value
    additionalPlaytimeInput.addEventListener('input', debounce(handleAdditionalPlaytimeChange, 300));
    additionalPlaytimeInput.addEventListener('change', handleAdditionalPlaytimeChange);
    
    goalPPInput.addEventListener('input', debounce(handleGoalPPChange, 300));
    goalPPInput.addEventListener('change', handleGoalPPChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            window.close();
        }
    });
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
