const Logger = require('../src/Logger');

/**
 * Abstract base class for all failsafe mechanisms
 * 1:1 replica of AbstractFailsafe.java
 */
class AbstractFailsafe {
    constructor(name, priority = 0) {
        this.name = name;
        this.priority = priority; // Higher priority = executed first
        this.logger = new Logger(`Failsafe-${name}`);
        this.enabled = true;
        this.triggered = false;
        this.lastTriggerTime = 0;
        this.triggerCount = 0;
        this.cooldownTime = 5000; // 5 seconds default cooldown
    }

    /**
     * Check if this failsafe should trigger
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        throw new Error('shouldTrigger must be implemented by subclass');
    }

    /**
     * Execute the failsafe action
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if macro should be stopped
     */
    async trigger(bot) {
        if (!this.enabled) return false;
        
        const now = Date.now();
        if (now - this.lastTriggerTime < this.cooldownTime) {
            return false; // Still in cooldown
        }

        this.triggered = true;
        this.lastTriggerTime = now;
        this.triggerCount++;
        
        this.logger.warn(`Failsafe triggered: ${this.name}`);
        
        try {
            return await this.onTrigger(bot);
        } catch (error) {
            this.logger.error(`Error in failsafe ${this.name}:`, error);
            return true; // Stop macro on error to be safe
        }
    }

    /**
     * Actual failsafe implementation - override in subclasses
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if macro should be stopped
     */
    async onTrigger(bot) {
        throw new Error('onTrigger must be implemented by subclass');
    }

    /**
     * Reset the failsafe state
     */
    reset() {
        this.triggered = false;
        this.lastTriggerTime = 0;
        this.logger.debug(`Failsafe ${this.name} reset`);
    }

    /**
     * Enable/disable this failsafe
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Failsafe ${this.name} ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if this failsafe is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Check if this failsafe is currently triggered
     * @returns {boolean}
     */
    isTriggered() {
        return this.triggered;
    }

    /**
     * Get the number of times this failsafe has triggered
     * @returns {number}
     */
    getTriggerCount() {
        return this.triggerCount;
    }

    /**
     * Get the last trigger time
     * @returns {number}
     */
    getLastTriggerTime() {
        return this.lastTriggerTime;
    }

    /**
     * Set the cooldown time
     * @param {number} cooldownTime
     */
    setCooldownTime(cooldownTime) {
        this.cooldownTime = cooldownTime;
    }

    /**
     * Get failsafe statistics
     * @returns {Object}
     */
    getStats() {
        return {
            name: this.name,
            priority: this.priority,
            enabled: this.enabled,
            triggered: this.triggered,
            triggerCount: this.triggerCount,
            lastTriggerTime: this.lastTriggerTime,
            cooldownTime: this.cooldownTime
        };
    }

    /**
     * Get a string representation of this failsafe
     * @returns {string}
     */
    toString() {
        return `${this.name}Failsafe{enabled=${this.enabled}, triggered=${this.triggered}}`;
    }
}

module.exports = AbstractFailsafe;

