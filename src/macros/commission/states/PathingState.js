const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');

/**
 * State for pathfinding and navigation
 * 1:1 replica of PathingState.java
 */
class PathingState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'Pathing');
        this.pathingStartTime = 0;
        this.maxPathTime = 60000; // 1 minute max
        this.targetPosition = null;
        this.pathAttempts = 0;
        this.maxPathAttempts = 3;
        this.stuckCheckTime = 0;
        this.lastPosition = null;
        this.stuckThreshold = 0.5; // blocks
        this.stuckTimeout = 10000; // 10 seconds
    }

    /**
     * Enter pathing state
     */
    async onEnter() {
        await super.onEnter();
        this.pathingStartTime = Date.now();
        this.pathAttempts = 0;
        this.stuckCheckTime = Date.now();
        this.log('info', 'Starting pathfinding');
    }

    /**
     * Execute pathfinding logic
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot) return;
        
        try {
            // Determine target position if not set
            if (!this.targetPosition) {
                this.targetPosition = this.determineTargetPosition(bot);
                if (!this.targetPosition) {
                    this.log('warn', 'No target position determined');
                    return;
                }
            }
            
            // Check if we're stuck
            if (await this.isStuck(bot)) {
                await this.handleStuck(bot);
            }
            
            // Execute pathfinding if we haven't exceeded max attempts
            if (this.pathAttempts < this.maxPathAttempts) {
                await this.executePathfinding(bot, this.targetPosition);
            }
            
            // Check if we've reached the target
            if (await this.hasReachedTarget(bot)) {
                this.log('info', 'Reached target position');
            }
            
        } catch (error) {
            this.log('error', 'Error in pathing state:', error);
        }
    }

    /**
     * Determine target position based on current context
     * @param {Object} bot
     * @returns {Object|null}
     */
    determineTargetPosition(bot) {
        const commission = this.macro.currentCommission;
        
        if (!commission) {
            // No specific commission, find general mining area
            return this.findGeneralMiningArea(bot);
        }
        
        // Find area suitable for the specific commission type
        return this.findCommissionSpecificArea(bot, commission);
    }

    /**
     * Find a general mining area
     * @param {Object} bot
     * @returns {Object|null}
     */
    findGeneralMiningArea(bot) {
        if (!bot.entity) return null;
        
        const playerPos = bot.entity.position;
        
        // Look for caves or underground areas
        const searchRadius = 50;
        
        for (let x = -searchRadius; x <= searchRadius; x += 10) {
            for (let z = -searchRadius; z <= searchRadius; z += 10) {
                for (let y = -10; y <= 10; y += 5) {
                    const pos = {
                        x: Math.floor(playerPos.x) + x,
                        y: Math.floor(playerPos.y) + y,
                        z: Math.floor(playerPos.z) + z
                    };
                    
                    if (this.isGoodMiningSpot(bot, pos)) {
                        this.log('debug', `Found mining area at ${pos.x}, ${pos.y}, ${pos.z}`);
                        return pos;
                    }
                }
            }
        }
        
        // If no specific area found, move deeper underground
        return {
            x: playerPos.x + (Math.random() - 0.5) * 20,
            y: Math.max(playerPos.y - 10, 10),
            z: playerPos.z + (Math.random() - 0.5) * 20
        };
    }

    /**
     * Find area specific to commission type
     * @param {Object} bot
     * @param {Object} commission
     * @returns {Object|null}
     */
    findCommissionSpecificArea(bot, commission) {
        if (!bot.entity) return null;
        
        const playerPos = bot.entity.position;
        
        // Define optimal Y levels for different commission types
        const optimalLevels = {
            mithril: { min: 20, max: 60 },
            gemstone: { min: 10, max: 50 },
            hardStone: { min: 30, max: 80 },
            coal: { min: 5, max: 128 },
            iron: { min: 0, max: 64 },
            gold: { min: 0, max: 32 },
            diamond: { min: 0, max: 16 },
            redstone: { min: 0, max: 16 },
            lapis: { min: 14, max: 34 }
        };
        
        const levels = optimalLevels[commission.type] || { min: 10, max: 60 };
        
        // Search for suitable area at optimal level
        const searchRadius = 30;
        
        for (let attempt = 0; attempt < 10; attempt++) {
            const targetY = Math.floor(Math.random() * (levels.max - levels.min) + levels.min);
            const targetX = playerPos.x + (Math.random() - 0.5) * searchRadius;
            const targetZ = playerPos.z + (Math.random() - 0.5) * searchRadius;
            
            const pos = {
                x: Math.floor(targetX),
                y: targetY,
                z: Math.floor(targetZ)
            };
            
            if (this.isGoodMiningSpot(bot, pos)) {
                this.log('debug', `Found ${commission.type} area at ${pos.x}, ${pos.y}, ${pos.z}`);
                return pos;
            }
        }
        
        // Fallback to general area
        return this.findGeneralMiningArea(bot);
    }

    /**
     * Check if a position is a good mining spot
     * @param {Object} bot
     * @param {Object} pos
     * @returns {boolean}
     */
    isGoodMiningSpot(bot, pos) {
        try {
            const block = bot.blockAt(pos);
            const aboveBlock = bot.blockAt({ x: pos.x, y: pos.y + 1, z: pos.z });
            const belowBlock = bot.blockAt({ x: pos.x, y: pos.y - 1, z: pos.z });
            
            // Check if it's a good spot (not water, lava, or bedrock)
            if (!block || !aboveBlock || !belowBlock) return false;
            
            const badBlocks = ['water', 'lava', 'bedrock', 'barrier'];
            if (badBlocks.some(bad => 
                block.name.includes(bad) || 
                aboveBlock.name.includes(bad) || 
                belowBlock.name.includes(bad)
            )) {
                return false;
            }
            
            // Check if there are mineable blocks nearby
            const mineableBlocks = ['stone', 'ore', 'cobblestone'];
            return mineableBlocks.some(mineable => 
                block.name.includes(mineable) ||
                aboveBlock.name.includes(mineable) ||
                belowBlock.name.includes(mineable)
            );
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Execute pathfinding to target position
     * @param {Object} bot
     * @param {Object} targetPos
     */
    async executePathfinding(bot, targetPos) {
        try {
            this.log('info', `Pathfinding to ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
            
            if (bot.pathfinder) {
                const goal = new bot.pathfinder.goals.GoalBlock(targetPos.x, targetPos.y, targetPos.z);
                await bot.pathfinder.goto(goal);
            } else {
                // Fallback: simple movement
                await this.simpleMoveTo(bot, targetPos);
            }
            
            this.pathAttempts++;
            
        } catch (error) {
            this.log('warn', `Pathfinding failed: ${error.message}`);
            this.pathAttempts++;
            
            // Try alternative approach
            await this.simpleMoveTo(bot, targetPos);
        }
    }

    /**
     * Simple movement without pathfinder
     * @param {Object} bot
     * @param {Object} targetPos
     */
    async simpleMoveTo(bot, targetPos) {
        if (!bot.entity) return;
        
        const playerPos = bot.entity.position;
        const direction = {
            x: targetPos.x - playerPos.x,
            y: targetPos.y - playerPos.y,
            z: targetPos.z - playerPos.z
        };
        
        // Normalize direction
        const distance = Math.sqrt(direction.x ** 2 + direction.z ** 2);
        if (distance > 0) {
            direction.x /= distance;
            direction.z /= distance;
        }
        
        // Move in direction
        bot.setControlState('forward', direction.x > 0.1);
        bot.setControlState('back', direction.x < -0.1);
        bot.setControlState('left', direction.z < -0.1);
        bot.setControlState('right', direction.z > 0.1);
        bot.setControlState('jump', direction.y > 0.5);
        
        // Move for a short time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stop movement
        bot.clearControlStates();
    }

    /**
     * Check if player is stuck
     * @param {Object} bot
     * @returns {boolean}
     */
    async isStuck(bot) {
        if (!bot.entity) return false;
        
        const currentPos = bot.entity.position;
        const now = Date.now();
        
        if (this.lastPosition) {
            const distance = currentPos.distanceTo(this.lastPosition);
            
            if (distance < this.stuckThreshold) {
                if (now - this.stuckCheckTime > this.stuckTimeout) {
                    return true;
                }
            } else {
                this.stuckCheckTime = now;
            }
        }
        
        this.lastPosition = currentPos.clone();
        return false;
    }

    /**
     * Handle being stuck
     * @param {Object} bot
     */
    async handleStuck(bot) {
        this.log('warn', 'Player appears to be stuck, attempting to unstuck');
        
        // Try jumping
        bot.setControlState('jump', true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        bot.setControlState('jump', false);
        
        // Try random movement
        const directions = ['forward', 'back', 'left', 'right'];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        
        bot.setControlState(randomDir, true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        bot.clearControlStates();
        
        // Reset stuck timer
        this.stuckCheckTime = Date.now();
    }

    /**
     * Check if we've reached the target
     * @param {Object} bot
     * @returns {boolean}
     */
    async hasReachedTarget(bot) {
        if (!bot.entity || !this.targetPosition) return false;
        
        const playerPos = bot.entity.position;
        const distance = playerPos.distanceTo(this.targetPosition);
        
        return distance < 5; // Within 5 blocks
    }

    /**
     * Set target position manually
     * @param {Object} position
     */
    setTargetPosition(position) {
        this.targetPosition = position;
        this.log('info', `Target position set to: ${position.x}, ${position.y}, ${position.z}`);
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check pathing timeout
        if (Date.now() - this.pathingStartTime > this.maxPathTime) {
            this.log('warn', 'Pathing timeout reached');
            return this.macro.states.MINING;
        }
        
        // Check if reached target or max attempts
        const bot = this.getBot();
        if (await this.hasReachedTarget(bot) || this.pathAttempts >= this.maxPathAttempts) {
            this.log('info', 'Pathing completed, proceeding to mining');
            return this.macro.states.MINING;
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = PathingState;

