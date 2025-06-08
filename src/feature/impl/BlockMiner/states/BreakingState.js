const BlockMinerState = require('./BlockMinerState');
const StartingState = require('./StartingState');
const ChoosingBlockState = require('./ChoosingBlockState');
const AngleUtil = require('../../../util/AngleUtil');
const { Vec3 } = require('vec3');

/**
 * BreakingState
 * 
 * State responsible for the actual mining/breaking of the selected block.
 * Handles player rotation, block breaking, and timing.
 */
class BreakingState extends BlockMinerState {
    constructor() {
        super();
        this.breakStartTime = 0;
        this.isBreaking = false;
        this.hasRotated = false;
        this.maxBreakTime = 10000; // 10 seconds max break time
        this.rotationTolerance = 0.1; // Radians
    }

    async onStart(miner) {
        await super.onStart(miner);
        this.breakStartTime = Date.now();
        this.isBreaking = false;
        this.hasRotated = false;
        
        const targetPos = miner.getTargetBlockPos();
        if (targetPos) {
            this.log(`Starting to break block at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
        } else {
            this.logError('No target block position set');
        }
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

        const targetPos = miner.getTargetBlockPos();
        if (!targetPos) {
            this.logError('No target block position');
            return new ChoosingBlockState();
        }

        try {
            // Check for timeout
            const elapsed = Date.now() - this.breakStartTime;
            if (elapsed > this.maxBreakTime) {
                this.logError('Timeout breaking block');
                this.stopBreaking(bot);
                return new StartingState();
            }

            // Check if block still exists
            const targetBlock = bot.blockAt(targetPos);
            if (!targetBlock || targetBlock.name === 'air') {
                this.log('Block broken successfully');
                this.stopBreaking(bot);
                return new StartingState(); // Look for next block
            }

            // Check if we need to rotate to face the block
            if (!this.hasRotated) {
                await this.rotateToBlock(bot, targetPos);
                this.hasRotated = true;
                return this; // Give rotation time to complete
            }

            // Start breaking if not already breaking
            if (!this.isBreaking) {
                await this.startBreaking(bot, targetBlock, targetPos);
                this.isBreaking = true;
            }

            // Continue breaking
            return this;

        } catch (error) {
            this.logError(`Error in BreakingState: ${error.message}`);
            this.stopBreaking(bot);
            return new StartingState();
        }
    }

    async rotateToBlock(bot, targetPos) {
        if (!bot || !targetPos) return;

        try {
            const playerPos = bot.entity.position;
            const targetAngle = AngleUtil.getAngle(playerPos, targetPos);
            
            // Calculate the center of the block for more accurate aiming
            const blockCenter = new Vec3(
                targetPos.x + 0.5,
                targetPos.y + 0.5,
                targetPos.z + 0.5
            );
            
            // Look at the center of the block
            await bot.lookAt(blockCenter);
            
            this.log(`Rotated to face block at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
            
            // Add a small delay to ensure rotation completes
            await this.sleep(100);
            
        } catch (error) {
            this.logError(`Error rotating to block: ${error.message}`);
        }
    }

    async startBreaking(bot, targetBlock, targetPos) {
        if (!bot || !targetBlock) return;

        try {
            // Calculate which face to target
            const face = this.getBestFace(bot, targetPos);
            
            this.log(`Starting to dig block: ${targetBlock.name}`);
            
            // Start digging the block
            await bot.dig(targetBlock, face);
            
            this.log('Digging started successfully');
            
        } catch (error) {
            this.logError(`Error starting to break block: ${error.message}`);
            
            // If dig fails, try again after a short delay
            await this.sleep(200);
            
            try {
                // Retry without specific face
                await bot.dig(targetBlock);
                this.log('Digging started successfully (retry)');
            } catch (retryError) {
                this.logError(`Retry dig failed: ${retryError.message}`);
                throw retryError;
            }
        }
    }

    getBestFace(bot, targetPos) {
        if (!bot || !targetPos) return 'north'; // Default face

        try {
            const playerPos = bot.entity.position;
            const dx = targetPos.x - playerPos.x;
            const dy = targetPos.y - (playerPos.y + 1.6); // Eye level
            const dz = targetPos.z - playerPos.z;

            // Determine the face based on which direction has the largest component
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            const absDz = Math.abs(dz);

            if (absDy > absDx && absDy > absDz) {
                return dy > 0 ? 'down' : 'up';
            } else if (absDx > absDz) {
                return dx > 0 ? 'west' : 'east';
            } else {
                return dz > 0 ? 'north' : 'south';
            }
        } catch (error) {
            this.logError(`Error calculating best face: ${error.message}`);
            return 'north';
        }
    }

    stopBreaking(bot) {
        if (!bot) return;

        try {
            // Stop digging if currently digging
            if (bot.targetDigBlock) {
                bot.stopDigging();
                this.log('Stopped digging');
            }
            
            this.isBreaking = false;
        } catch (error) {
            this.logError(`Error stopping break: ${error.message}`);
        }
    }

    isLookingAtTarget(bot, targetPos) {
        if (!bot || !targetPos) return false;

        try {
            const playerPos = bot.entity.position;
            const targetAngle = AngleUtil.getAngle(playerPos, targetPos);
            
            const currentYaw = AngleUtil.normalizeAngle(bot.entity.yaw);
            const currentPitch = bot.entity.pitch;
            
            const yawDiff = Math.abs(AngleUtil.normalizeAngle(targetAngle.yaw - currentYaw));
            const pitchDiff = Math.abs(targetAngle.pitch - currentPitch);
            
            return yawDiff < this.rotationTolerance && pitchDiff < this.rotationTolerance;
        } catch (error) {
            return false;
        }
    }

    calculateBreakTime(bot, block) {
        if (!bot || !block) return 1000; // Default 1 second

        try {
            // Get the held item
            const heldItem = bot.heldItem;
            
            // Calculate break time based on block hardness and tool efficiency
            // This is a simplified calculation
            const baseTime = this.getBlockHardness(block.name);
            const toolMultiplier = this.getToolMultiplier(heldItem, block.name);
            
            return Math.max(baseTime / toolMultiplier, 50); // Minimum 50ms
        } catch (error) {
            return 1000;
        }
    }

    getBlockHardness(blockName) {
        // Simplified hardness values (in milliseconds)
        const hardness = {
            'stone': 1500,
            'cobblestone': 2000,
            'diamond_ore': 3000,
            'gold_ore': 3000,
            'iron_ore': 3000,
            'coal_ore': 3000,
            'redstone_ore': 3000,
            'mithril_ore': 2000, // Hypixel custom
            'titanium_ore': 4000, // Hypixel custom
            'dirt': 500,
            'sand': 500,
            'gravel': 600,
            'netherrack': 400
        };
        
        return hardness[blockName] || 1000;
    }

    getToolMultiplier(tool, blockName) {
        if (!tool) return 1;

        const toolName = tool.name.toLowerCase();
        
        // Tool efficiency multipliers
        if (toolName.includes('pickaxe')) {
            if (toolName.includes('diamond')) return 8;
            if (toolName.includes('iron')) return 6;
            if (toolName.includes('stone')) return 4;
            if (toolName.includes('wood')) return 2;
            return 1;
        }
        
        if (toolName.includes('drill')) {
            return 10; // Hypixel drills are very efficient
        }
        
        if (toolName.includes('gauntlet')) {
            return 12; // Hypixel gauntlets are very efficient
        }
        
        return 1;
    }

    async onEnd(miner) {
        await super.onEnd(miner);
        
        const bot = this.getBot(miner);
        if (bot) {
            this.stopBreaking(bot);
        }
        
        const elapsed = Date.now() - this.breakStartTime;
        this.log(`Breaking phase completed in ${elapsed}ms`);
    }
}

module.exports = BreakingState;

