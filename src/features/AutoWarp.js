const AbstractFeature = require('./AbstractFeature');
const Logger = require('../Logger');

/**
 * Automatically warps to different locations based on context
 * 1:1 replica of AutoWarp.java
 */
class AutoWarp extends AbstractFeature {
    constructor() {
        super('AutoWarp');
        this.logger = new Logger('AutoWarp');
        this.lastWarpTime = 0;
        this.warpCooldown = 30000; // 30 seconds between warps
        this.warpQueue = [];
        this.currentWarpAttempts = 0;
        this.maxWarpAttempts = 3;
        
        // Warp conditions and triggers
        this.warpTriggers = {
            inventoryFull: {
                enabled: true,
                threshold: 32, // slots
                targetLocation: 'hub'
            },
            lowHealth: {
                enabled: true,
                threshold: 5, // health points
                targetLocation: 'hub'
            },
            noTargets: {
                enabled: false,
                timeout: 60000, // 1 minute
                targetLocation: 'hub'
            },
            scheduled: {
                enabled: false,
                interval: 300000, // 5 minutes
                targetLocation: 'hub'
            }
        };
        
        // Warp location mappings
        this.warpLocations = {
            'hub': ['hub', 'spawn'],
            'dwarven_mines': ['mines', 'dwarven'],
            'crystal_hollows': ['ch', 'crystals', 'hollows'],
            'deep_caverns': ['deep', 'caverns'],
            'spider_den': ['spider'],
            'end': ['end'],
            'park': ['park'],
            'barn': ['barn'],
            'mushroom_desert': ['desert'],
            'gold_mine': ['gold']
        };
        
        this.lastTargetCheckTime = 0;
        this.lastScheduledWarp = 0;
    }

    /**
     * Enable auto warp feature
     */
    onEnable() {
        this.logger.info('AutoWarp enabled');
        this.lastScheduledWarp = Date.now();
    }

    /**
     * Disable auto warp feature
     */
    onDisable() {
        this.logger.info('AutoWarp disabled');
        this.warpQueue.length = 0;
    }

    /**
     * Main auto warp logic
     */
    async onTick() {
        if (!this.enabled || !this.bot) return;
        
        try {
            // Process warp queue
            if (this.warpQueue.length > 0) {
                await this.processWarpQueue();
                return;
            }
            
            // Check various warp triggers
            await this.checkWarpTriggers();
            
        } catch (error) {
            this.logger.error('Error in AutoWarp tick:', error);
        }
    }

    /**
     * Check all warp triggers
     */
    async checkWarpTriggers() {
        // Check inventory full trigger
        if (this.warpTriggers.inventoryFull.enabled && this.shouldWarpInventoryFull()) {
            this.queueWarp(this.warpTriggers.inventoryFull.targetLocation, 'Inventory full');
            return;
        }
        
        // Check low health trigger
        if (this.warpTriggers.lowHealth.enabled && this.shouldWarpLowHealth()) {
            this.queueWarp(this.warpTriggers.lowHealth.targetLocation, 'Low health');
            return;
        }
        
        // Check no targets trigger
        if (this.warpTriggers.noTargets.enabled && this.shouldWarpNoTargets()) {
            this.queueWarp(this.warpTriggers.noTargets.targetLocation, 'No targets found');
            return;
        }
        
        // Check scheduled warp trigger
        if (this.warpTriggers.scheduled.enabled && this.shouldWarpScheduled()) {
            this.queueWarp(this.warpTriggers.scheduled.targetLocation, 'Scheduled warp');
            return;
        }
    }

    /**
     * Check if should warp due to full inventory
     * @returns {boolean}
     */
    shouldWarpInventoryFull() {
        if (!this.bot.inventory) return false;
        
        const items = this.bot.inventory.items();
        const threshold = this.warpTriggers.inventoryFull.threshold;
        
        return items.length >= threshold;
    }

    /**
     * Check if should warp due to low health
     * @returns {boolean}
     */
    shouldWarpLowHealth() {
        if (typeof this.bot.health !== 'number') return false;
        
        const threshold = this.warpTriggers.lowHealth.threshold;
        return this.bot.health <= threshold;
    }

    /**
     * Check if should warp due to no targets
     * @returns {boolean}
     */
    shouldWarpNoTargets() {
        const now = Date.now();
        const timeout = this.warpTriggers.noTargets.timeout;
        
        // Simple check - if no recent activity
        if (now - this.lastTargetCheckTime > timeout) {
            this.lastTargetCheckTime = now;
            return true;
        }
        
        return false;
    }

    /**
     * Check if should warp on schedule
     * @returns {boolean}
     */
    shouldWarpScheduled() {
        const now = Date.now();
        const interval = this.warpTriggers.scheduled.interval;
        
        if (now - this.lastScheduledWarp > interval) {
            this.lastScheduledWarp = now;
            return true;
        }
        
        return false;
    }

    /**
     * Queue a warp request
     * @param {string} location
     * @param {string} reason
     */
    queueWarp(location, reason = '') {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastWarpTime < this.warpCooldown) {
            this.logger.debug(`Warp to ${location} skipped - cooldown active`);
            return;
        }
        
        // Check if already queued
        if (this.warpQueue.some(warp => warp.location === location)) {
            return;
        }
        
        this.warpQueue.push({
            location,
            reason,
            timestamp: now,
            attempts: 0
        });
        
        this.logger.info(`Queued warp to ${location}: ${reason}`);
    }

    /**
     * Process the warp queue
     */
    async processWarpQueue() {
        if (this.warpQueue.length === 0) return;
        
        const warpRequest = this.warpQueue[0];
        
        try {
            const success = await this.executeWarp(warpRequest.location);
            
            if (success) {
                this.logger.info(`Successfully warped to ${warpRequest.location}`);
                this.warpQueue.shift(); // Remove from queue
                this.lastWarpTime = Date.now();
                this.currentWarpAttempts = 0;
            } else {
                warpRequest.attempts++;
                
                if (warpRequest.attempts >= this.maxWarpAttempts) {
                    this.logger.error(`Failed to warp to ${warpRequest.location} after ${this.maxWarpAttempts} attempts`);
                    this.warpQueue.shift(); // Remove failed warp
                } else {
                    this.logger.warn(`Warp attempt ${warpRequest.attempts} failed for ${warpRequest.location}`);
                }
            }
            
        } catch (error) {
            this.logger.error(`Error processing warp to ${warpRequest.location}:`, error);
            this.warpQueue.shift(); // Remove problematic warp
        }
    }

    /**
     * Execute a warp to the specified location
     * @param {string} location
     * @returns {boolean} Success
     */
    async executeWarp(location) {
        const commands = this.getWarpCommands(location);
        
        for (const command of commands) {
            try {
                this.logger.debug(`Trying warp command: ${command}`);
                await this.bot.chat(command);
                
                // Wait and check if warp was successful
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                if (await this.verifyWarpSuccess(location)) {
                    return true;
                }
                
            } catch (error) {
                this.logger.debug(`Warp command failed: ${command}`);
            }
        }
        
        return false;
    }

    /**
     * Get possible warp commands for a location
     * @param {string} location
     * @returns {Array<string>}
     */
    getWarpCommands(location) {
        const commands = [];
        const aliases = this.warpLocations[location] || [location];
        
        for (const alias of aliases) {
            commands.push(`/warp ${alias}`);
            commands.push(`/visit ${alias}`);
            commands.push(`/is ${alias}`);
        }
        
        return commands;
    }

    /**
     * Verify that warp was successful
     * @param {string} location
     * @returns {boolean}
     */
    async verifyWarpSuccess(location) {
        try {
            if (!this.bot.entity) return false;
            
            const position = this.bot.entity.position;
            
            // Basic location verification based on coordinates
            const locationChecks = {
                'hub': () => Math.abs(position.x) < 200 && Math.abs(position.z) < 200,
                'dwarven_mines': () => position.y < 100 && position.y > 0,
                'crystal_hollows': () => position.y < 100,
                'deep_caverns': () => position.y < 50,
                'end': () => position.y > 100
            };
            
            const check = locationChecks[location];
            if (check) {
                return check();
            }
            
            // If no specific check, assume success
            return true;
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Manually queue a warp
     * @param {string} location
     * @param {string} reason
     */
    requestWarp(location, reason = 'Manual request') {
        this.queueWarp(location, reason);
    }

    /**
     * Enable/disable a warp trigger
     * @param {string} trigger
     * @param {boolean} enabled
     */
    setTriggerEnabled(trigger, enabled) {
        if (this.warpTriggers[trigger]) {
            this.warpTriggers[trigger].enabled = enabled;
            this.logger.info(`Warp trigger '${trigger}' ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Update trigger settings
     * @param {string} trigger
     * @param {Object} settings
     */
    updateTrigger(trigger, settings) {
        if (this.warpTriggers[trigger]) {
            Object.assign(this.warpTriggers[trigger], settings);
            this.logger.info(`Updated trigger '${trigger}' settings`);
        }
    }

    /**
     * Clear warp queue
     */
    clearQueue() {
        this.warpQueue.length = 0;
        this.logger.info('Warp queue cleared');
    }

    /**
     * Get feature statistics
     * @returns {Object}
     */
    getStats() {
        return {
            enabled: this.enabled,
            lastWarpTime: this.lastWarpTime,
            warpCooldown: this.warpCooldown,
            queueLength: this.warpQueue.length,
            currentQueue: this.warpQueue.map(w => ({ 
                location: w.location, 
                reason: w.reason, 
                attempts: w.attempts 
            })),
            triggers: Object.entries(this.warpTriggers).map(([name, config]) => ({
                name,
                enabled: config.enabled,
                ...config
            }))
        };
    }
}

module.exports = AutoWarp;

