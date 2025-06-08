const BlockMinerState = require('./BlockMinerState');
const ChoosingBlockState = require('./ChoosingBlockState');
const ApplyAbilityState = require('./ApplyAbilityState');
const BlockUtil = require('../../../util/BlockUtil');
const PlayerUtil = require('../../../util/PlayerUtil');

/**
 * StartingState
 * 
 * Initial state for the BlockMiner. This state handles the startup logic,
 * checks for blocks to mine, and determines whether to activate pickaxe ability
 * or proceed directly to block selection.
 */
class StartingState extends BlockMinerState {
    constructor() {
        super();
        this.startTime = 0;
    }

    async onStart(miner) {
        await super.onStart(miner);
        this.startTime = Date.now();
        this.log('Initializing mining process...');
    }

    async onTick(miner) {
        if (!this.isValidMiner(miner)) {
            return null;
        }

        const bot = this.getBot(miner);
        if (!bot) {
            this.logError('Bot not available');
            return null;
        }

        try {
            // Check for timeout
            const elapsed = Date.now() - this.startTime;
            if (elapsed > miner.getWaitThreshold()) {
                this.logError('Timeout waiting for blocks');
                miner.setError(miner.errorTypes.NOT_ENOUGH_BLOCKS);
                return null;
            }

            // Check if there are blocks available to mine
            const availableBlocks = await this.findAvailableBlocks(miner);
            if (availableBlocks.length === 0) {
                // No blocks found, wait a bit and try again
                await this.sleep(100);
                return this;
            }

            this.log(`Found ${availableBlocks.length} blocks to mine`);

            // Check if we should activate pickaxe ability
            if (this.shouldActivatePickaxeAbility(miner)) {
                this.log('Activating pickaxe ability before mining');
                return new ApplyAbilityState();
            }

            // Proceed directly to block selection
            this.log('Proceeding to block selection');
            return new ChoosingBlockState();

        } catch (error) {
            this.logError(`Error in StartingState: ${error.message}`);
            return null;
        }
    }

    async findAvailableBlocks(miner) {
        const bot = this.getBot(miner);
        if (!bot) return [];

        try {
            // Get blocks within mining range
            const playerPos = bot.entity.position;
            const mineableBlocks = [];
            const searchRadius = 5; // Search within 5 block radius

            // Scan for blocks
            for (let x = -searchRadius; x <= searchRadius; x++) {
                for (let y = -searchRadius; y <= searchRadius; y++) {
                    for (let z = -searchRadius; z <= searchRadius; z++) {
                        const pos = playerPos.clone().offset(x, y, z);
                        const block = bot.blockAt(pos);
                        
                        if (block && this.isTargetBlock(miner, block)) {
                            const distance = playerPos.distanceTo(pos);
                            mineableBlocks.push({
                                block: block,
                                position: pos,
                                distance: distance,
                                priority: miner.getBlockPriority().get(block.stateId) || 0
                            });
                        }
                    }
                }
            }

            // Sort by priority then by distance
            mineableBlocks.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority; // Higher priority first
                }
                return a.distance - b.distance; // Closer blocks first
            });

            return mineableBlocks;

        } catch (error) {
            this.logError(`Error finding blocks: ${error.message}`);
            return [];
        }
    }

    isTargetBlock(miner, block) {
        if (!block || !miner) return false;
        
        const blockPriority = miner.getBlockPriority();
        return blockPriority.has(block.stateId) && blockPriority.get(block.stateId) > 0;
    }

    shouldActivatePickaxeAbility(miner) {
        if (!miner) return false;

        // Check if ability is available
        if (miner.getPickaxeAbilityState() !== 'AVAILABLE') {
            return false;
        }

        // Check if we haven't tried too many times
        if (miner.getRetryActivatePickaxeAbility() >= 2) {
            return false;
        }

        // For now, always try to activate ability if available
        // This could be made configurable based on mining strategy
        return true;
    }

    async onEnd(miner) {
        await super.onEnd(miner);
        const elapsed = Date.now() - this.startTime;
        this.log(`Starting phase completed in ${elapsed}ms`);
    }
}

module.exports = StartingState;

