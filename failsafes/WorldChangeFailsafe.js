const AbstractFailsafe = require('./AbstractFailsafe');

/**
 * Detects when the bot changes worlds/dimensions
 * 1:1 replica of WorldChangeFailsafe.java
 */
class WorldChangeFailsafe extends AbstractFailsafe {
    constructor() {
        super('WorldChange', 8); // High priority
        this.currentWorld = null;
        this.currentDimension = null;
        this.worldHistory = [];
        this.maxHistorySize = 10;
        this.allowedWorlds = new Set();
        this.allowAllWorlds = true;
    }

    /**
     * Check if world/dimension has changed
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        if (!bot.game) return false;
        
        const currentDimension = bot.game.dimension;
        const currentWorld = this.getCurrentWorld(bot);
        
        // First time initialization
        if (this.currentWorld === null || this.currentDimension === null) {
            this.currentWorld = currentWorld;
            this.currentDimension = currentDimension;
            this.addToHistory('Initial world set', currentWorld, currentDimension);
            return false;
        }
        
        // Check for dimension change
        if (currentDimension !== this.currentDimension) {
            this.addToHistory('Dimension change', currentWorld, currentDimension);
            return true;
        }
        
        // Check for world change
        if (currentWorld !== this.currentWorld) {
            this.addToHistory('World change', currentWorld, currentDimension);
            return true;
        }
        
        return false;
    }

    /**
     * Handle world change
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        const newWorld = this.getCurrentWorld(bot);
        const newDimension = bot.game ? bot.game.dimension : 'unknown';
        
        const oldWorld = this.currentWorld;
        const oldDimension = this.currentDimension;
        
        this.logger.warn(`World change detected: ${oldWorld}/${oldDimension} -> ${newWorld}/${newDimension}`);
        
        // Update current state
        this.currentWorld = newWorld;
        this.currentDimension = newDimension;
        
        // Check if new world is allowed
        if (!this.allowAllWorlds && !this.allowedWorlds.has(newWorld)) {
            this.logger.error(`Moved to disallowed world: ${newWorld}`);
            
            // Emit event
            if (bot.emit) {
                bot.emit('world_change_blocked', {
                    oldWorld,
                    newWorld,
                    oldDimension,
                    newDimension,
                    timestamp: Date.now()
                });
            }
            
            return true; // Stop macro
        }
        
        // Emit world change event
        if (bot.emit) {
            bot.emit('world_changed', {
                oldWorld,
                newWorld,
                oldDimension,
                newDimension,
                timestamp: Date.now()
            });
        }
        
        // Allow macro to continue in new world
        return false;
    }

    /**
     * Get current world name
     * @param {Object} bot
     * @returns {string}
     */
    getCurrentWorld(bot) {
        if (bot.game && bot.game.levelType) {
            return bot.game.levelType;
        }
        
        // Try to get from scoreboard or other sources
        if (bot.scoreboard && bot.scoreboard.sidebar) {
            const title = bot.scoreboard.sidebar.title;
            if (title && typeof title === 'string') {
                return this.extractWorldFromTitle(title);
            }
        }
        
        return 'unknown';
    }

    /**
     * Extract world name from scoreboard title
     * @param {string} title
     * @returns {string}
     */
    extractWorldFromTitle(title) {
        // Common patterns for Hypixel Skyblock
        const patterns = [
            /SKYBLOCK\s*-\s*(.+)/i,
            /(.+)\s*-\s*SKYBLOCK/i,
            /(.+)\s*ISLAND/i
        ];
        
        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return title.trim();
    }

    /**
     * Add entry to world history
     * @param {string} event
     * @param {string} world
     * @param {string} dimension
     */
    addToHistory(event, world, dimension) {
        this.worldHistory.push({
            event,
            world,
            dimension,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.worldHistory.length > this.maxHistorySize) {
            this.worldHistory.shift();
        }
    }

    /**
     * Add allowed world
     * @param {string} world
     */
    addAllowedWorld(world) {
        this.allowedWorlds.add(world);
        this.allowAllWorlds = false;
        this.logger.info(`Added allowed world: ${world}`);
    }

    /**
     * Remove allowed world
     * @param {string} world
     */
    removeAllowedWorld(world) {
        this.allowedWorlds.delete(world);
        this.logger.info(`Removed allowed world: ${world}`);
    }

    /**
     * Set whether to allow all worlds
     * @param {boolean} allow
     */
    setAllowAllWorlds(allow) {
        this.allowAllWorlds = allow;
        this.logger.info(`Allow all worlds: ${allow}`);
    }

    /**
     * Get world statistics
     * @returns {Object}
     */
    getWorldStats() {
        return {
            currentWorld: this.currentWorld,
            currentDimension: this.currentDimension,
            allowAllWorlds: this.allowAllWorlds,
            allowedWorlds: Array.from(this.allowedWorlds),
            recentHistory: this.worldHistory.slice(-5)
        };
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.currentWorld = null;
        this.currentDimension = null;
        this.worldHistory.length = 0;
    }
}

module.exports = WorldChangeFailsafe;

