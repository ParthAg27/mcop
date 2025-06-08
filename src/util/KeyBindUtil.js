/**
 * KeyBindUtil - Utility for key binding and movement control
 * Perfect 1:1 replica of Java KeyBindUtil.java
 */

const Logger = require('./Logger');

class KeyBindUtil {
    // Key binding mappings
    static keyBindMap = new Map([
        ['forward', 0],
        ['left', 90],
        ['back', 180],
        ['right', -90]
    ]);
    
    // Movement keys
    static allKeys = [
        'attack',
        'use',
        'back',
        'forward',
        'left',
        'right',
        'jump',
        'sneak',
        'sprint'
    ];
    
    // Movement-only keys
    static movementKeys = [
        'back',
        'forward',
        'left',
        'right',
        'jump'
    ];
    
    /**
     * Press a key on the bot
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} key - Key to press
     * @param {boolean} state - True to press, false to release
     */
    static setKey(bot, key, state) {
        if (!bot || !bot.setControlState) {
            Logger.warn(`[KeyBindUtil] Bot or setControlState not available`);
            return;
        }
        
        try {
            // Map common key names to mineflayer control states
            const keyMap = {
                'forward': 'forward',
                'back': 'back',
                'left': 'left',
                'right': 'right',
                'jump': 'jump',
                'sneak': 'sneak',
                'sprint': 'sprint'
            };
            
            const controlState = keyMap[key];
            if (controlState) {
                bot.setControlState(controlState, state);
            } else {
                Logger.warn(`[KeyBindUtil] Unknown key: ${key}`);
            }
        } catch (error) {
            Logger.error(`[KeyBindUtil] Error setting key ${key}: ${error.message}`);
        }
    }
    
    /**
     * Press a key
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} key - Key to press
     */
    static pressKey(bot, key) {
        KeyBindUtil.setKey(bot, key, true);
    }
    
    /**
     * Release a key
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} key - Key to release
     */
    static releaseKey(bot, key) {
        KeyBindUtil.setKey(bot, key, false);
    }
    
    /**
     * Release all movement keys
     * @param {Object} bot - Mineflayer bot instance
     */
    static releaseAllKeys(bot) {
        try {
            KeyBindUtil.movementKeys.forEach(key => {
                KeyBindUtil.releaseKey(bot, key);
            });
        } catch (error) {
            Logger.error(`[KeyBindUtil] Error releasing all keys: ${error.message}`);
        }
    }
    
    /**
     * Release all keys (including actions)
     * @param {Object} bot - Mineflayer bot instance
     */
    static releaseAllKeysIncludingActions(bot) {
        try {
            KeyBindUtil.allKeys.forEach(key => {
                KeyBindUtil.releaseKey(bot, key);
            });
        } catch (error) {
            Logger.error(`[KeyBindUtil] Error releasing all keys: ${error.message}`);
        }
    }
    
    /**
     * Get angle for a specific key
     * @param {string} key - Key name
     * @returns {number} - Angle in degrees
     */
    static getKeyAngle(key) {
        return KeyBindUtil.keyBindMap.get(key) || 0;
    }
    
    /**
     * Get key for a specific angle
     * @param {number} angle - Angle in degrees
     * @returns {string|null} - Key name or null
     */
    static getKeyForAngle(angle) {
        // Normalize angle to 0-360 range
        angle = ((angle % 360) + 360) % 360;
        
        for (const [key, keyAngle] of KeyBindUtil.keyBindMap.entries()) {
            const normalizedKeyAngle = ((keyAngle % 360) + 360) % 360;
            if (Math.abs(normalizedKeyAngle - angle) < 45) {
                return key;
            }
        }
        
        return null;
    }
    
    /**
     * Move in a specific direction
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} yaw - Direction in degrees
     * @param {boolean} sprint - Whether to sprint
     */
    static moveInDirection(bot, yaw, sprint = false) {
        try {
            // Calculate movement keys based on yaw
            const normalizedYaw = ((yaw % 360) + 360) % 360;
            
            // Reset movement
            KeyBindUtil.releaseAllKeys(bot);
            
            // Determine primary movement direction
            if (normalizedYaw >= 315 || normalizedYaw < 45) {
                KeyBindUtil.pressKey(bot, 'forward');
            } else if (normalizedYaw >= 45 && normalizedYaw < 135) {
                KeyBindUtil.pressKey(bot, 'right');
            } else if (normalizedYaw >= 135 && normalizedYaw < 225) {
                KeyBindUtil.pressKey(bot, 'back');
            } else if (normalizedYaw >= 225 && normalizedYaw < 315) {
                KeyBindUtil.pressKey(bot, 'left');
            }
            
            // Handle sprint
            if (sprint) {
                KeyBindUtil.pressKey(bot, 'sprint');
            }
        } catch (error) {
            Logger.error(`[KeyBindUtil] Error moving in direction: ${error.message}`);
        }
    }
    
    /**
     * Stop all movement
     * @param {Object} bot - Mineflayer bot instance
     */
    static stopMovement(bot) {
        KeyBindUtil.releaseAllKeys(bot);
    }
    
    /**
     * Check if a key is a movement key
     * @param {string} key - Key to check
     * @returns {boolean} - True if movement key
     */
    static isMovementKey(key) {
        return KeyBindUtil.movementKeys.includes(key);
    }
    
    /**
     * Get all movement keys
     * @returns {Array<string>} - Array of movement key names
     */
    static getMovementKeys() {
        return [...KeyBindUtil.movementKeys];
    }
    
    /**
     * Get all keys
     * @returns {Array<string>} - Array of all key names
     */
    static getAllKeys() {
        return [...KeyBindUtil.allKeys];
    }
}

module.exports = KeyBindUtil;

