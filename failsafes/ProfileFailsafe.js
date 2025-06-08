/**
 * ProfileFailsafe - Detects profile menu opening and reacts accordingly
 * Perfect 1:1 replica of Java ProfileFailsafe.java
 */

const AbstractFailsafe = require('./AbstractFailsafe');
const MacroManager = require('../src/macro/MacroManager');
const Logger = require('../src/util/Logger');

class ProfileFailsafe extends AbstractFailsafe {
    static instance = null;
    
    constructor() {
        super();
        this.TRIGGER_PHRASE = "Profile";
    }
    
    static getInstance() {
        if (!ProfileFailsafe.instance) {
            ProfileFailsafe.instance = new ProfileFailsafe();
        }
        return ProfileFailsafe.instance;
    }
    
    getName() {
        return "ProfileFailsafe";
    }
    
    getFailsafeType() {
        return "PLAYER_PROFILE_OPEN";
    }
    
    getPriority() {
        return 2;
    }
    
    /**
     * Handle window/GUI opening events
     * @param {Object} window - Window data
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if should trigger failsafe
     */
    onWindowOpen(window, bot) {
        if (!window || !window.title) {
            return false;
        }
        
        try {
            // Clean the window title (remove color codes)
            const cleanTitle = window.title.replace(/§[0-9a-fk-or]/g, '').toLowerCase();
            
            if (cleanTitle.includes(this.TRIGGER_PHRASE.toLowerCase())) {
                this.note(`Detected window open with title containing: ${cleanTitle}`);
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error(`[ProfileFailsafe] Error in onWindowOpen: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Handle chat messages that might indicate profile opening
     * @param {string} message - Chat message
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if should trigger failsafe
     */
    onChatMessage(message, bot) {
        if (!message) return false;
        
        try {
            // Clean the message (remove color codes)
            const cleanMessage = message.replace(/§[0-9a-fk-or]/g, '').toLowerCase();
            
            // Check for profile-related keywords
            const profileKeywords = [
                'profile',
                'viewing profile',
                'player profile',
                'profile menu'
            ];
            
            for (const keyword of profileKeywords) {
                if (cleanMessage.includes(keyword)) {
                    this.note(`Detected profile-related message: ${cleanMessage}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            Logger.error(`[ProfileFailsafe] Error in onChatMessage: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check for profile indicators in bot state
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if should trigger failsafe
     */
    onTick(bot) {
        if (!bot) return false;
        
        try {
            // Check if a suspicious window is open
            if (bot.currentWindow && bot.currentWindow.title) {
                return this.onWindowOpen(bot.currentWindow, bot);
            }
            
            return false;
        } catch (error) {
            Logger.error(`[ProfileFailsafe] Error in onTick: ${error.message}`);
            return false;
        }
    }
    
    react() {
        try {
            // Close any open windows/screens
            this.closeCurrentScreen();
            
            this.note("Closing the menu... continuing");
            return true;
        } catch (error) {
            Logger.error(`[ProfileFailsafe] Error in react: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Close current screen/window
     */
    closeCurrentScreen() {
        try {
            // In mineflayer, we can close windows
            if (global.bot && global.bot.currentWindow) {
                global.bot.closeWindow(global.bot.currentWindow);
                Logger.info("[ProfileFailsafe] Closed current window");
            }
        } catch (error) {
            Logger.error(`[ProfileFailsafe] Error closing screen: ${error.message}`);
        }
    }
}

module.exports = ProfileFailsafe;

