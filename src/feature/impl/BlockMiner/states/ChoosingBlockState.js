const BlockMinerState = require('./BlockMinerState');
const BreakingState = require('./BreakingState');
const StartingState = require('./StartingState');
const BlockUtil = require('../../../util/BlockUtil');
const PlayerUtil = require('../../../util/PlayerUtil');
const AngleUtil = require('../../../util/AngleUtil');

/**
 * ChoosingBlockState
 * 
 * State responsible for selecting the best block to mine based on priority,
 * distance, and other criteria. Transitions to BreakingState once a target is selected.
 */
class ChoosingBlockState extends BlockMinerState {
    constructor() {
        super();
        this.searchStartTime = 0;
        this.maxSearchTime = 5000; // 5 seconds max search time
    }

    async onStart(miner) {
        await super.onStart(miner);
        this.searchStartTime = Date.now();
        this.log('Selecting optimal block to mine...');
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
            const elapsed = Date.now() - this.searchStartTime;
            if (elapsed > this.maxSearchTime) {
                this.logError('Timeout selecting block');
                miner.setError(miner.errorTypes.NOT_ENOUGH_BLOCKS);
                return null;
            }

            // Find the best block to mine
            const targetBlock = await this.findBestBlock(miner);
            if (!targetBlock) {
                // No suitable block found, go back to starting state
                this.logWarn('No suitable blocks found, returning to starting state');
                return new StartingState();
            }

            // Set the target in the miner
            miner.setTargetBlockPos(targetBlock.position);
            miner.setTargetBlockType(targetBlock.block.type);

            this.log(`Selected block at ${targetBlock.position.x}, ${targetBlock.position.y}, ${targetBlock.position.z}`);

            // Transition to breaking state
            return new BreakingState();

        } catch (error) {
            this.logError(`Error in ChoosingBlockState: ${error.message}`);
            return new StartingState();
        }
    }

    async findBestBlock(miner) {
        const bot = this.getBot(miner);
        if (!bot) return null;

        try {
            const playerPos = bot.entity.position;
            const candidates = [];
            const searchRadius = 5;
            const maxReach = 4.5; // Maximum reach distance

            // Scan for blocks
            for (let x = -searchRadius; x <= searchRadius; x++) {
                for (let y = -searchRadius; y <= searchRadius; y++) {
                    for (let z = -searchRadius; z <= searchRadius; z++) {
                        const pos = playerPos.clone().offset(x, y, z);
                        const block = bot.blockAt(pos);
                        
                        if (block && this.isValidTarget(miner, block, pos)) {
                            const distance = playerPos.distanceTo(pos);
                            
                            // Skip blocks that are too far
                            if (distance > maxReach) continue;
                            
                            const priority = miner.getBlockPriority().get(block.stateId) || 0;
                            const score = this.calculateBlockScore(priority, distance, pos, playerPos);
                            
                            candidates.push({
                                block: block,
                                position: pos,
                                distance: distance,
                                priority: priority,
                                score: score
                            });
                        }
                    }
                }
            }

            if (candidates.length === 0) {
                return null;
            }

            // Sort by score (higher is better)
            candidates.sort((a, b) => b.score - a.score);

            // Return the best candidate
            const bestBlock = candidates[0];
            this.log(`Best block score: ${bestBlock.score.toFixed(2)} (priority: ${bestBlock.priority}, distance: ${bestBlock.distance.toFixed(2)})`);
            
            return bestBlock;

        } catch (error) {
            this.logError(`Error finding best block: ${error.message}`);
            return null;
        }
    }

    isValidTarget(miner, block, position) {
        if (!block || !miner || !position) return false;

        // Check if block is in our target list
        const blockPriority = miner.getBlockPriority();
        if (!blockPriority.has(block.stateId) || blockPriority.get(block.stateId) <= 0) {
            return false;
        }

        // Check if block is not air
        if (block.name === 'air') {
            return false;
        }

        // Check if we can reach the block
        const bot = this.getBot(miner);
        if (bot) {
            const playerPos = bot.entity.position;
            const distance = playerPos.distanceTo(position);
            if (distance > 4.5) return false;

            // Check line of sight (simplified)
            const canSee = this.hasLineOfSight(bot, playerPos, position);
            if (!canSee) return false;
        }

        return true;
    }

    calculateBlockScore(priority, distance, blockPos, playerPos) {
        // Base score from priority (higher priority = higher score)
        let score = priority * 100;

        // Distance penalty (closer blocks are better)
        const distancePenalty = distance * 10;
        score -= distancePenalty;

        // Height preference (slightly prefer blocks at player eye level)
        const eyeLevel = playerPos.y + 1.6; // Player eye height
        const heightDiff = Math.abs(blockPos.y - eyeLevel);
        const heightPenalty = heightDiff * 5;
        score -= heightPenalty;

        // Angle preference (prefer blocks in front of player)
        const bot = this.getBot();
        if (bot) {
            const yaw = bot.entity.yaw;
            const targetAngle = AngleUtil.getAngle(playerPos, blockPos);
            const angleDiff = Math.abs(AngleUtil.normalizeAngle(targetAngle.yaw - yaw));
            const anglePenalty = angleDiff * 0.5;
            score -= anglePenalty;
        }

        return Math.max(score, 0); // Ensure non-negative score
    }

    hasLineOfSight(bot, from, to) {
        if (!bot) return true; // Assume true if we can't check

        try {
            // Simple line of sight check
            const direction = to.clone().subtract(from).normalize();
            const distance = from.distanceTo(to);
            const steps = Math.ceil(distance * 4); // Check every 0.25 blocks

            for (let i = 1; i < steps; i++) {
                const checkPos = from.clone().add(direction.clone().scale(i * 0.25));
                const block = bot.blockAt(checkPos);
                
                if (block && block.name !== 'air' && !this.isTransparent(block)) {
                    return false; // Line of sight blocked
                }
            }

            return true;
        } catch (error) {
            // If we can't check, assume line of sight is clear
            return true;
        }
    }

    isTransparent(block) {
        if (!block) return true;
        
        const transparentBlocks = [
            'air', 'water', 'lava', 'glass', 'ice', 'leaves',
            'vine', 'ladder', 'torch', 'redstone_torch'
        ];
        
        return transparentBlocks.includes(block.name);
    }

    async onEnd(miner) {
        await super.onEnd(miner);
        const elapsed = Date.now() - this.searchStartTime;
        this.log(`Block selection completed in ${elapsed}ms`);
    }
}

module.exports = ChoosingBlockState;

