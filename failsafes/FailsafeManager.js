const Logger = require('../src/Logger');
const MightyMinerConfig = require('../config/MightyMinerConfig');

/**
 * Manages all failsafe mechanisms
 * 1:1 replica of FailsafeManager.java
 */
class FailsafeManager {
    constructor() {
        this.logger = new Logger('FailsafeManager');
        this.failsafes = [];
        this.enabled = true;
        this.checkInterval = 100; // Check every 100ms
        this.intervalId = null;
        this.stats = {
            totalChecks: 0,
            totalTriggers: 0,
            lastCheckTime: 0
        };
        
        this.logger.info('FailsafeManager initialized');
    }

    /**
     * Register a failsafe
     * @param {AbstractFailsafe} failsafe
     */
    registerFailsafe(failsafe) {
        this.failsafes.push(failsafe);
        
        // Sort by priority (higher priority first)
        this.failsafes.sort((a, b) => b.priority - a.priority);
        
        this.logger.info(`Registered failsafe: ${failsafe.name} (priority: ${failsafe.priority})`);
    }

    /**
     * Unregister a failsafe
     * @param {string} name
     */
    unregisterFailsafe(name) {
        const index = this.failsafes.findIndex(f => f.name === name);
        if (index !== -1) {
            this.failsafes.splice(index, 1);
            this.logger.info(`Unregistered failsafe: ${name}`);
        }
    }

    /**
     * Start the failsafe monitoring
     * @param {Object} bot - Mineflayer bot instance
     */
    start(bot) {
        if (this.intervalId) {
            this.stop();
        }
        
        this.bot = bot;
        this.intervalId = setInterval(() => {
            this.checkFailsafes();
        }, this.checkInterval);
        
        this.logger.info('Failsafe monitoring started');
    }

    /**
     * Stop the failsafe monitoring
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logger.info('Failsafe monitoring stopped');
        }
    }

    /**
     * Check all failsafes
     */
    async checkFailsafes() {
        if (!this.enabled || !this.bot) return;
        
        this.stats.totalChecks++;
        this.stats.lastCheckTime = Date.now();
        
        for (const failsafe of this.failsafes) {
            if (!failsafe.isEnabled()) continue;
            
            try {
                const shouldTrigger = await failsafe.shouldTrigger(this.bot);
                if (shouldTrigger) {
                    this.stats.totalTriggers++;
                    const shouldStop = await failsafe.trigger(this.bot);
                    
                    if (shouldStop) {
                        this.logger.warn(`Failsafe ${failsafe.name} requested macro stop`);
                        await this.handleMacroStop(failsafe);
                        break; // Stop checking other failsafes
                    }
                }
            } catch (error) {
                this.logger.error(`Error checking failsafe ${failsafe.name}:`, error);
            }
        }
    }

    /**
     * Handle macro stop request from failsafe
     * @param {AbstractFailsafe} failsafe
     */
    async handleMacroStop(failsafe) {
        this.logger.warn(`Stopping macro due to failsafe: ${failsafe.name}`);
        
        // Emit event for macro manager to handle
        if (this.bot && this.bot.emit) {
            this.bot.emit('failsafe_triggered', {
                failsafe: failsafe.name,
                reason: 'Failsafe requested macro stop',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Reset all failsafes
     */
    resetAll() {
        for (const failsafe of this.failsafes) {
            failsafe.reset();
        }
        this.logger.info('Reset all failsafes');
    }

    /**
     * Enable/disable failsafe monitoring
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Failsafe monitoring ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if failsafe monitoring is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get failsafe by name
     * @param {string} name
     * @returns {AbstractFailsafe|null}
     */
    getFailsafe(name) {
        return this.failsafes.find(f => f.name === name) || null;
    }

    /**
     * Get all failsafes
     * @returns {Array<AbstractFailsafe>}
     */
    getAllFailsafes() {
        return [...this.failsafes];
    }

    /**
     * Get failsafe statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            failsafeCount: this.failsafes.length,
            enabledCount: this.failsafes.filter(f => f.isEnabled()).length,
            triggeredCount: this.failsafes.filter(f => f.isTriggered()).length,
            isRunning: this.intervalId !== null
        };
    }

    /**
     * Get detailed failsafe information
     * @returns {Array<Object>}
     */
    getDetailedStats() {
        return this.failsafes.map(f => f.getStats());
    }

    /**
     * Set the check interval
     * @param {number} interval - Interval in milliseconds
     */
    setCheckInterval(interval) {
        this.checkInterval = interval;
        
        // Restart monitoring with new interval if currently running
        if (this.intervalId && this.bot) {
            this.stop();
            this.start(this.bot);
        }
    }

    /**
     * Shutdown the failsafe manager
     */
    shutdown() {
        this.stop();
        this.resetAll();
        this.failsafes.length = 0;
        this.logger.info('FailsafeManager shutdown complete');
    }
}

module.exports = FailsafeManager;

