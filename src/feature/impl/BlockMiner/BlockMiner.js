const AbstractFeature = require('../AbstractFeature');
const Logger = require('../../core/Logger');
const BlockUtil = require('../../util/BlockUtil');
const PlayerUtil = require('../../util/PlayerUtil');
const InventoryUtil = require('../../util/InventoryUtil');
const AngleUtil = require('../../util/AngleUtil');

// Import states
const StartingState = require('./states/StartingState');
const ChoosingBlockState = require('./states/ChoosingBlockState');
const BreakingState = require('./states/BreakingState');
const ApplyAbilityState = require('./states/ApplyAbilityState');

/**
 * BlockMiner
 * 
 * Main controller class for automatic block mining feature.
 * Implements a state machine pattern to manage different phases of the mining process.
 * Handles mining block selection, breaking, and speed boost management.
 */
class BlockMiner extends AbstractFeature {
    static instance = null;

    static getInstance() {
        if (!BlockMiner.instance) {
            BlockMiner.instance = new BlockMiner();
        }
        return BlockMiner.instance;
    }

    constructor() {
        super('BlockMiner');
        this.logger = new Logger('BlockMiner');
        this.currentState = null;
        
        // Pickaxe ability state tracking
        this.pickaxeAbilityState = 'AVAILABLE'; // 'AVAILABLE' or 'UNAVAILABLE'
        
        // Error handling
        this.error = 'NONE';
        this.errorTypes = {
            NONE: 'NONE',
            NOT_ENOUGH_BLOCKS: 'NOT_ENOUGH_BLOCKS',
            NO_TOOLS_AVAILABLE: 'NO_TOOLS_AVAILABLE', 
            NO_POINTS_FOUND: 'NO_POINTS_FOUND',
            NO_TARGET_BLOCKS: 'NO_TARGET_BLOCKS',
            NO_PICKAXE_ABILITY: 'NO_PICKAXE_ABILITY'
        };
        
        // Mining parameters
        this.blockPriority = new Map(); // Block state ID -> priority
        this.targetBlockPos = null;
        this.targetBlockType = null;
        this.miningSpeed = 0;
        this.waitThreshold = 5000; // 5 seconds
        
        // Ability retry tracking
        this.retryActivatePickaxeAbility = 0;
        this.triedAlt = false;
        
        // Event handlers
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Chat message handler for pickaxe ability tracking
        if (this.bot) {
            this.bot.on('message', (message) => this.onChat(message));
        }
    }

    getName() {
        return 'BlockMiner';
    }

    /**
     * Starts the BlockMiner with specified parameters.
     * 
     * @param blocksToMine Array of mineable block types to target
     * @param miningSpeed Base mining speed (higher = faster)
     * @param priority Array of priority values for block selection
     * @param miningTool Item name of the tool to use for mining
     */
    start(blocksToMine, miningSpeed, priority, miningTool) {
        this.logger.info('Starting BlockMiner...');
        
        // Try to hold the specified mining tool if provided
        if (miningTool && miningTool.trim() !== '') {
            const inventoryUtil = new InventoryUtil(this.bot);
            if (!inventoryUtil.holdItem(miningTool)) {
                this.logger.error(`${miningTool} not found in inventory!`);
                this.error = this.errorTypes.NO_TOOLS_AVAILABLE;
                this.stop();
                return;
            }
        }
        
        // Validate blocks to mine
        if (!blocksToMine || !Array.isArray(blocksToMine) || 
            !priority || priority.every(p => p === 0)) {
            this.logger.error('Target blocks not set!');
            this.error = this.errorTypes.NO_TARGET_BLOCKS;
            return;
        }
        
        // Build priority mapping for block selection
        this.blockPriority.clear();
        for (let i = 0; i < blocksToMine.length; i++) {
            const blockType = blocksToMine[i];
            if (blockType && blockType.stateIds) {
                for (const stateId of blockType.stateIds) {
                    this.blockPriority.set(stateId, priority[i] || 0);
                }
            }
        }
        
        // Initialize parameters
        this.miningSpeed = miningSpeed - 200; // Base adjustment to mining speed
        this.error = this.errorTypes.NONE;
        this.pickaxeAbilityState = 'AVAILABLE';
        this.retryActivatePickaxeAbility = 0;
        this.triedAlt = false;
        
        // Initialize with starting state
        this.currentState = new StartingState();
        this.enable();
        
        this.logger.info('BlockMiner started successfully');
    }

    stop() {
        this.logger.info('Stopping BlockMiner...');
        
        try {
            if (this.currentState) {
                try {
                    this.currentState.onEnd(this);
                } catch (error) {
                    this.logger.error(`Error ending current state during stop: ${error.message}`);
                }
                this.currentState = null;
            }
            
            super.stop();
            
            // Release all key binds
            try {
                this.releaseAllKeys();
            } catch (error) {
                this.logger.error(`Error releasing keys: ${error.message}`);
            }
            
        } catch (error) {
            this.logger.error(`Error during BlockMiner stop: ${error.message}`);
            // Force stop anyway
            this.currentState = null;
            try {
                super.stop();
            } catch (stopError) {
                this.logger.error(`Error in super.stop(): ${stopError.message}`);
            }
        }
        
        this.logger.info('BlockMiner stopped');
    }

    async execute() {
        if (!this.isEnabled()) return;
        
        if (!this.currentState) {
            this.logger.error('Current state is null, stopping BlockMiner');
            this.stop();
            return;
        }

        try {
            const nextState = await this.currentState.onTick(this);
            await this.transitionTo(nextState);
        } catch (error) {
            this.logger.error(`Error in state tick: ${error.message}`);
            this.stop();
        }

        // Check for ability retry limit
        if (this.retryActivatePickaxeAbility >= 4) {
            this.error = this.errorTypes.NO_PICKAXE_ABILITY;
            this.logger.error('Too many pickaxe ability activation attempts, stopping');
            this.stop();
        }
    }

    async transitionTo(nextState) {
        try {
            // Skip if no state change
            if (this.currentState === nextState) {
                return;
            }

            // Track ability activation retries
            if ((this.currentState instanceof StartingState && nextState instanceof ApplyAbilityState) ||
                (this.currentState instanceof ApplyAbilityState && nextState instanceof StartingState)) {
                this.retryActivatePickaxeAbility++;
            } else {
                this.retryActivatePickaxeAbility = 0;
            }

            // Safely end current state
            if (this.currentState) {
                try {
                    await this.currentState.onEnd(this);
                } catch (error) {
                    this.logger.error(`Error ending state: ${error.message}`);
                }
            }
            
            this.currentState = nextState;

            if (!this.currentState) {
                this.logger.warn('null state, returning');
                return;
            }

            // Log state transition
            this.logger.info(`Transitioning to state: ${this.currentState.constructor.name}`);

            // Safely start new state
            try {
                await this.currentState.onStart(this);
            } catch (error) {
                this.logger.error(`Error starting state: ${error.message}`);
                this.stop();
            }
        } catch (error) {
            this.logger.error(`Error in state transition: ${error.message}`);
            this.stop();
        }
    }

    onChat(message) {
        try {
            if (!message || typeof message !== 'object') return;
            
            const text = message.toString();
            if (!text) return;

            // Track pickaxe ability availability
            if (text.includes('is now available!')) {
                this.pickaxeAbilityState = 'AVAILABLE';
                this.logger.info('Pickaxe ability is now available');
            }
            
            if (text.includes('You used your') || 
                text.includes('Your pickaxe ability is on cooldown for')) {
                this.pickaxeAbilityState = 'UNAVAILABLE';
                this.logger.info('Pickaxe ability is now unavailable');
            }
        } catch (error) {
            this.logger.error(`Error processing chat message: ${error.message}`);
        }
    }

    // Utility methods for states
    releaseAllKeys() {
        if (!this.bot) return;
        
        // Stop all movement and actions
        this.bot.setControlState('forward', false);
        this.bot.setControlState('back', false);
        this.bot.setControlState('left', false);
        this.bot.setControlState('right', false);
        this.bot.setControlState('jump', false);
        this.bot.setControlState('sneak', false);
        this.bot.setControlState('sprint', false);
        
        // Stop attacking/mining
        this.bot.stopDigging();
    }

    // Getters and setters
    getPickaxeAbilityState() {
        return this.pickaxeAbilityState;
    }

    setPickaxeAbilityState(state) {
        this.pickaxeAbilityState = state;
    }

    getError() {
        return this.error;
    }

    setError(error) {
        this.error = error;
        this.logger.error(`BlockMiner error set: ${error}`);
    }

    getBlockPriority() {
        return this.blockPriority;
    }

    getTargetBlockPos() {
        return this.targetBlockPos;
    }

    setTargetBlockPos(pos) {
        this.targetBlockPos = pos;
    }

    getTargetBlockType() {
        return this.targetBlockType;
    }

    setTargetBlockType(type) {
        this.targetBlockType = type;
    }

    getMiningSpeed() {
        return this.miningSpeed;
    }

    setMiningSpeed(speed) {
        this.miningSpeed = speed;
    }

    getWaitThreshold() {
        return this.waitThreshold;
    }

    setWaitThreshold(threshold) {
        this.waitThreshold = threshold;
    }

    getCurrentState() {
        return this.currentState;
    }

    getRetryActivatePickaxeAbility() {
        return this.retryActivatePickaxeAbility;
    }

    incrementRetryActivatePickaxeAbility() {
        this.retryActivatePickaxeAbility++;
    }

    resetRetryActivatePickaxeAbility() {
        this.retryActivatePickaxeAbility = 0;
    }

    isTriedAlt() {
        return this.triedAlt;
    }

    setTriedAlt(triedAlt) {
        this.triedAlt = triedAlt;
    }

    // Static convenience methods
    static startMining(bot, blocksToMine, miningSpeed, priority, miningTool) {
        const miner = BlockMiner.getInstance();
        miner.bot = bot;
        miner.start(blocksToMine, miningSpeed, priority, miningTool);
        return miner;
    }

    static stopMining() {
        const miner = BlockMiner.getInstance();
        miner.stop();
    }

    static getMiner() {
        return BlockMiner.getInstance();
    }

    // Error type constants
    static get ErrorTypes() {
        return {
            NONE: 'NONE',
            NOT_ENOUGH_BLOCKS: 'NOT_ENOUGH_BLOCKS',
            NO_TOOLS_AVAILABLE: 'NO_TOOLS_AVAILABLE',
            NO_POINTS_FOUND: 'NO_POINTS_FOUND',
            NO_TARGET_BLOCKS: 'NO_TARGET_BLOCKS',
            NO_PICKAXE_ABILITY: 'NO_PICKAXE_ABILITY'
        };
    }

    // Pickaxe ability state constants
    static get PickaxeAbilityState() {
        return {
            AVAILABLE: 'AVAILABLE',
            UNAVAILABLE: 'UNAVAILABLE'
        };
    }
}

module.exports = BlockMiner;

