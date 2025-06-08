/**
 * GameStateHandler - Manages game state and location tracking
 * Perfect 1:1 replica of Java GameStateHandler.java
 */

const ScoreboardUtil = require('../util/ScoreboardUtil');
const InventoryUtil = require('../util/InventoryUtil');
const Location = require('../util/helper/location/Location');
const Logger = require('../util/Logger');

class GameStateHandler {
    static instance = null;
    
    constructor() {
        this.serverIp = "";
        this.currentLocation = Location.KNOWHERE;
        this.currentSubLocation = "KNOWHERE";
        this.godpotActive = false;
        this.cookieActive = false;
        this.areaPattern = /Area:\s(.+)/;
    }
    
    static getInstance() {
        if (!GameStateHandler.instance) {
            GameStateHandler.instance = new GameStateHandler();
        }
        return GameStateHandler.instance;
    }
    
    /**
     * Check if player is in Skyblock
     * @returns {boolean} - True if in Skyblock
     */
    isPlayerInSkyBlock() {
        const locations = Location.values();
        const currentIndex = locations.indexOf(this.currentLocation);
        return currentIndex < locations.length - 3;
    }
    
    /**
     * Get current location
     * @returns {Location} - Current location
     */
    getCurrentLocation() {
        return this.currentLocation;
    }
    
    /**
     * Get current sub-location
     * @returns {string} - Current sub-location
     */
    getCurrentSubLocation() {
        return this.currentSubLocation;
    }
    
    /**
     * Check if godpot is active
     * @returns {boolean} - True if godpot is active
     */
    isGodpotActive() {
        return this.godpotActive;
    }
    
    /**
     * Check if booster cookie is active
     * @returns {boolean} - True if cookie is active
     */
    isCookieActive() {
        return this.cookieActive;
    }
    
    /**
     * Get server IP
     * @returns {string} - Server IP
     */
    getServerIp() {
        return this.serverIp;
    }
    
    /**
     * Handle world unload event
     */
    onWorldUnload() {
        this.currentLocation = Location.KNOWHERE;
        this.currentSubLocation = "KNOWHERE";
        Logger.info("[GameStateHandler] World unloaded, location reset");
    }
    
    /**
     * Handle world load event
     * @param {Object} bot - Mineflayer bot instance
     */
    onWorldLoad(bot) {
        if (bot && bot.game && bot.game.serverHost) {
            this.serverIp = bot.game.serverHost;
            Logger.info(`[GameStateHandler] Connected to server: ${this.serverIp}`);
        }
    }
    
    /**
     * Handle tablist update
     * @param {Array} tablist - Tablist entries
     * @param {Object} bot - Mineflayer bot instance
     */
    onTablistUpdate(tablist, bot) {
        if (!tablist || tablist.length === 0) {
            return;
        }
        
        try {
            const scoreboard = ScoreboardUtil.getScoreboard(bot);
            this.updateLocationFromTablist(tablist);
            this.updateActiveEffects(tablist, scoreboard);
        } catch (error) {
            Logger.error(`[GameStateHandler] Error in onTablistUpdate: ${error.message}`);
        }
    }
    
    /**
     * Handle scoreboard update
     * @param {Array} scoreboard - Scoreboard lines
     * @param {Object} bot - Mineflayer bot instance
     */
    onScoreboardUpdate(scoreboard, bot) {
        if (!scoreboard || scoreboard.length === 0) {
            return;
        }
        
        try {
            this.updateLocationFromScoreboard(scoreboard);
        } catch (error) {
            Logger.error(`[GameStateHandler] Error in onScoreboardUpdate: ${error.message}`);
        }
    }
    
    /**
     * Update location from tablist
     * @param {Array} tablist - Tablist entries
     */
    updateLocationFromTablist(tablist) {
        for (const entry of tablist) {
            const text = entry.text || entry;
            if (typeof text === 'string') {
                const areaMatch = this.areaPattern.exec(text);
                if (areaMatch) {
                    const areaName = areaMatch[1].trim();
                    this.updateLocation(areaName);
                    break;
                }
            }
        }
    }
    
    /**
     * Update location from scoreboard
     * @param {Array} scoreboard - Scoreboard lines
     */
    updateLocationFromScoreboard(scoreboard) {
        for (const line of scoreboard) {
            const text = line.text || line;
            if (typeof text === 'string') {
                // Look for location indicators in scoreboard
                const location = Location.fromName(text.trim());
                if (location !== Location.KNOWHERE) {
                    this.currentLocation = location;
                    Logger.debug(`[GameStateHandler] Location updated from scoreboard: ${location.getName()}`);
                    break;
                }
            }
        }
    }
    
    /**
     * Update location based on area name
     * @param {string} areaName - Area name
     */
    updateLocation(areaName) {
        const location = Location.fromName(areaName);
        if (location !== this.currentLocation) {
            this.currentLocation = location;
            this.currentSubLocation = areaName;
            Logger.info(`[GameStateHandler] Location changed to: ${location.getName()} (${areaName})`);
        }
    }
    
    /**
     * Update active effects from tablist and scoreboard
     * @param {Array} tablist - Tablist entries
     * @param {Array} scoreboard - Scoreboard lines
     */
    updateActiveEffects(tablist, scoreboard) {
        const allText = [...tablist, ...scoreboard]
            .map(entry => entry.text || entry)
            .filter(text => typeof text === 'string')
            .join(' ')
            .toLowerCase();
        
        // Check for godpot
        const newGodpotActive = allText.includes('godpot') || allText.includes('god pot');
        if (newGodpotActive !== this.godpotActive) {
            this.godpotActive = newGodpotActive;
            Logger.info(`[GameStateHandler] Godpot status: ${this.godpotActive ? 'Active' : 'Inactive'}`);
        }
        
        // Check for booster cookie
        const newCookieActive = allText.includes('cookie') || allText.includes('booster');
        if (newCookieActive !== this.cookieActive) {
            this.cookieActive = newCookieActive;
            Logger.info(`[GameStateHandler] Cookie status: ${this.cookieActive ? 'Active' : 'Inactive'}`);
        }
    }
    
    /**
     * Reset all state
     */
    reset() {
        this.currentLocation = Location.KNOWHERE;
        this.currentSubLocation = "KNOWHERE";
        this.godpotActive = false;
        this.cookieActive = false;
        this.serverIp = "";
        Logger.info("[GameStateHandler] State reset");
    }
}

module.exports = GameStateHandler;

