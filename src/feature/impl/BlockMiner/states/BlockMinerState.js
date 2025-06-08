const Logger = require('../../../core/Logger');

/**
 * BlockMinerState
 * 
 * Base class for all states in the BlockMiner state machine.
 * Implements the State design pattern to encapsulate different behaviors
 * for each phase of the mining process.
 */
class BlockMinerState {
    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    /**
     * Called when entering this state.
     * Use for initialization and setup logic.
     * 
     * @param miner Reference to the BlockMiner instance
     */
    async onStart(miner) {
        this.log('State started');
    }
    
    /**
     * Called on each game tick while this state is active.
     * Contains the main processing logic for the state.
     * 
     * @param miner Reference to the BlockMiner instance
     * @return The next state to transition to, or this if staying in current state
     */
    async onTick(miner) {
        // Default implementation - override in subclasses
        return this;
    }
    
    /**
     * Called when exiting this state.
     * Use for cleanup and finalization logic.
     * 
     * @param miner Reference to the BlockMiner instance
     */
    async onEnd(miner) {
        this.log('State ended');
    }

    log(message) {
        this.logger.info(message);
    }

    logError(message) {
        this.logger.error(message);
    }

    logWarn(message) {
        this.logger.warn(message);
    }

    // Utility method for delays
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if miner is valid and enabled
    isValidMiner(miner) {
        return miner && miner.isEnabled && miner.isEnabled();
    }

    // Get bot reference from miner
    getBot(miner) {
        return miner ? miner.bot : null;
    }
}

module.exports = BlockMinerState;

