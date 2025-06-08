const CommissionMacroState = require('./CommissionMacroState');
const BlockUtil = require('../../../utils/BlockUtil');
const PlayerUtil = require('../../../utils/PlayerUtil');
const AngleUtil = require('../../../utils/AngleUtil');

/**
 * Mining state for commission macro - handles actual mining
 * 1:1 replica of MiningState.java
 */
class MiningState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'Mining');
        this.targetBlocks = [];
        this.currentTarget = null;
        this.miningStartTime = 0;
        this.lastBlockCount = 0;
        this.stuckCheckTime = 0;
        this.lastPosition = null;
        this.miningRadius = 6; // blocks
        this.maxMiningTime = 180000; // 3 minutes per mining session
    }

    /**
     * Enter mining state
     */
    async onEnter() {
        await super.onEnter();
        this.miningStartTime = Date.now();
        this.updateTargetBlocks();
        this.log('info', 'Started mining for commission');
    }

    /**
     * Exit mining state
     */
    async onExit() {
        await super.onExit();
        if (this.currentTarget) {
            await this.stopMining();
        }
        this.log('info', 'Stopped mining');
    }

    /**
     * Mining execution loop
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot || !this.macro.currentCommission) return;
        
        try {
            // Update target blocks periodically
            if (Date.now() - this.stuckCheckTime > 5000) {
                this.updateTargetBlocks();
                this.checkIfStuck(bot);
                this.stuckCheckTime = Date.now();
            }
            
            // Find and mine target blocks
            if (!this.currentTarget || !this.isValidTarget(this.currentTarget)) {
                this.currentTarget = this.findBestTarget(bot);
            }
            
            if (this.currentTarget) {
                await this.mineTarget(bot, this.currentTarget);
            } else {
                this.log('debug', 'No valid mining targets found');
                await this.searchForTargets(bot);
            }
            
        } catch (error) {
            this.log('error', 'Error in mining state:', error);
        }
    }

    /**
     * Update list of target blocks based on current commission
     */
    updateTargetBlocks() {
        const commission = this.macro.currentCommission;
        if (!commission) return;
        
        // Map commission types to block types
        const blockMapping = {
            mithril: ['mithril_ore'],
            gemstone: ['ruby_ore', 'amber_ore', 'sapphire_ore', 'jade_ore', 'amethyst_ore', 'topaz_ore'],
            hardStone: ['stone', 'andesite', 'granite', 'diorite'],
            cobblestone: ['cobblestone'],
            coal: ['coal_ore'],
            iron: ['iron_ore'],
            gold: ['gold_ore'],
            diamond: ['diamond_ore'],
            emerald: ['emerald_ore'],
            redstone: ['redstone_ore'],
            lapis: ['lapis_ore']
        };
        
        this.targetBlocks = blockMapping[commission.type] || [commission.type];
        this.log('debug', `Updated target blocks: ${this.targetBlocks.join(', ')}`);
    }

    /**
     * Find the best target block to mine
     * @param {Object} bot
     * @returns {Object|null}
     */
    findBestTarget(bot) {
        if (!bot.entity) return null;
        
        const playerPos = bot.entity.position;
        const targets = [];
        
        // Scan for target blocks within radius
        for (let x = -this.miningRadius; x <= this.miningRadius; x++) {
            for (let y = -3; y <= 3; y++) {
                for (let z = -this.miningRadius; z <= this.miningRadius; z++) {
                    const pos = {
                        x: Math.floor(playerPos.x) + x,
                        y: Math.floor(playerPos.y) + y,
                        z: Math.floor(playerPos.z) + z
                    };
                    
                    const block = bot.blockAt(pos);
                    if (this.isTargetBlock(block)) {
                        const distance = playerPos.distanceTo(pos);
                        targets.push({ block, pos, distance });
                    }
                }
            }
        }
        
        // Sort by distance and return closest
        targets.sort((a, b) => a.distance - b.distance);
        return targets.length > 0 ? targets[0] : null;
    }

    /**
     * Check if a block is a target block
     * @param {Object} block
     * @returns {boolean}
     */
    isTargetBlock(block) {
        if (!block || !block.name) return false;
        return this.targetBlocks.some(target => block.name.includes(target));
    }

    /**
     * Check if a target is still valid
     * @param {Object} target
     * @returns {boolean}
     */
    isValidTarget(target) {
        if (!target || !target.pos) return false;
        
        const bot = this.getBot();
        const block = bot.blockAt(target.pos);
        
        return this.isTargetBlock(block);
    }

    /**
     * Mine the target block
     * @param {Object} bot
     * @param {Object} target
     */
    async mineTarget(bot, target) {
        try {
            // Look at the target
            const targetPos = target.pos;
            const angles = AngleUtil.getAngles(bot.entity.position, targetPos);
            await PlayerUtil.rotateTo(bot, angles.yaw, angles.pitch);
            
            // Start mining
            if (!bot.targetDigBlock || !bot.targetDigBlock.position.equals(targetPos)) {
                await bot.dig(target.block);
                this.log('debug', `Mining block at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
            }
            
        } catch (error) {
            this.log('warn', 'Failed to mine target block:', error);
            this.currentTarget = null;
        }
    }

    /**
     * Stop current mining activity
     */
    async stopMining() {
        const bot = this.getBot();
        if (bot && bot.targetDigBlock) {
            bot.stopDigging();
        }
        this.currentTarget = null;
    }

    /**
     * Search for new targets by moving around
     * @param {Object} bot
     */
    async searchForTargets(bot) {
        // Simple movement to find new blocks
        if (Math.random() < 0.1) { // 10% chance to move
            const directions = [
                { x: 1, z: 0 }, { x: -1, z: 0 },
                { x: 0, z: 1 }, { x: 0, z: -1 }
            ];
            
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const targetPos = {
                x: bot.entity.position.x + direction.x * 3,
                y: bot.entity.position.y,
                z: bot.entity.position.z + direction.z * 3
            };
            
            try {
                await bot.pathfinder.goto(targetPos);
            } catch (error) {
                this.log('debug', 'Failed to move to search position');
            }
        }
    }

    /**
     * Check if player is stuck in same position
     * @param {Object} bot
     */
    checkIfStuck(bot) {
        if (!bot.entity) return;
        
        const currentPos = bot.entity.position;
        
        if (this.lastPosition) {
            const distance = currentPos.distanceTo(this.lastPosition);
            if (distance < 0.5) {
                this.log('warn', 'Player appears to be stuck');
                // Try to unstuck by jumping
                bot.setControlState('jump', true);
                setTimeout(() => {
                    bot.setControlState('jump', false);
                }, 1000);
            }
        }
        
        this.lastPosition = currentPos.clone();
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check if commission is completed
        if (this.macro.currentCommission) {
            const commission = this.getCommissionUtil().getCommissionByType(this.macro.currentCommission.type);
            if (commission && commission.completed) {
                this.log('info', 'Commission completed, transitioning to claiming');
                return this.macro.states.CLAIMING;
            }
        }
        
        // Check mining timeout
        if (Date.now() - this.miningStartTime > this.maxMiningTime) {
            this.log('warn', 'Mining timeout reached');
            return this.macro.states.STARTING;
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = MiningState;

