const Logger = require('../../../Logger');

/**
 * Abstract base class for commission macro states
 * 1:1 replica of CommissionMacroState.java
 */
class CommissionMacroState {
    constructor(macro, name) {
        this.macro = macro;
        this.name = name;
        this.logger = new Logger(`CommissionState-${name}`);
        this.startTime = 0;
        this.maxDuration = 300000; // 5 minutes max per state
    }

    /**
     * Called when entering this state
     */
    async onEnter() {
        this.startTime = Date.now();
        this.logger.debug(`Entering ${this.name} state`);
    }

    /**
     * Called when exiting this state
     */
    async onExit() {
        this.logger.debug(`Exiting ${this.name} state`);
    }

    /**
     * Called every tick while in this state
     */
    async onTick() {
        // Override in subclasses
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check for timeout
        if (this.hasTimedOut()) {
            this.logger.warn(`State ${this.name} timed out`);
            return this.macro.states.STARTING;
        }
        
        // Override in subclasses
        return null;
    }

    /**
     * Check if this state has timed out
     * @returns {boolean}
     */
    hasTimedOut() {
        return Date.now() - this.startTime > this.maxDuration;
    }

    /**
     * Get time spent in this state
     * @returns {number}
     */
    getTimeInState() {
        return Date.now() - this.startTime;
    }

    /**
     * Get the bot instance
     * @returns {Object}
     */
    getBot() {
        return this.macro.bot;
    }

    /**
     * Get commission utility
     * @returns {CommissionUtil}
     */
    getCommissionUtil() {
        return this.macro.commissionUtil;
    }

    /**
     * Check if macro should stop
     * @returns {boolean}
     */
    shouldStop() {
        return this.macro.shouldStop();
    }

    /**
     * Log state-specific information
     * @param {string} level
     * @param {string} message
     */
    log(level, message) {
        this.logger[level](`[${this.name}] ${message}`);
    }
}

module.exports = CommissionMacroState;

