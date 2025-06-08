const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');
const AngleUtil = require('../../../utils/AngleUtil');

/**
 * State for killing mobs (for mob-related commissions)
 * 1:1 replica of MobKillingState.java
 */
class MobKillingState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'MobKilling');
        this.killingStartTime = 0;
        this.maxKillingTime = 300000; // 5 minutes max
        this.currentTarget = null;
        this.killCount = 0;
        this.targetKills = 0;
        this.searchRadius = 20; // blocks
        this.attackCooldown = 500; // milliseconds
        this.lastAttackTime = 0;
        
        // Target mob types for different commission types
        this.mobTargets = {
            'goblin': ['goblin'],
            'ghost': ['ghost'],
            'skeleton': ['skeleton'],
            'zombie': ['zombie'],
            'spider': ['spider'],
            'bat': ['bat'],
            'slime': ['slime'],
            'creeper': ['creeper'],
            'enderman': ['enderman'],
            'blaze': ['blaze']
        };
    }

    /**
     * Enter mob killing state
     */
    async onEnter() {
        await super.onEnter();
        this.killingStartTime = Date.now();
        this.killCount = 0;
        this.determineTargetMobs();
        this.log('info', `Starting mob killing for commission`);
    }

    /**
     * Exit mob killing state
     */
    async onExit() {
        await super.onExit();
        if (this.currentTarget) {
            this.stopAttacking();
        }
        this.log('info', `Killed ${this.killCount} mobs`);
    }

    /**
     * Execute mob killing logic
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot) return;
        
        try {
            // Find target if we don't have one
            if (!this.currentTarget || !this.isValidTarget(this.currentTarget)) {
                this.currentTarget = this.findBestTarget(bot);
            }
            
            if (this.currentTarget) {
                await this.attackTarget(bot, this.currentTarget);
            } else {
                // No targets found, search for more
                await this.searchForMobs(bot);
            }
            
        } catch (error) {
            this.log('error', 'Error in mob killing state:', error);
        }
    }

    /**
     * Determine target mobs based on current commission
     */
    determineTargetMobs() {
        const commission = this.macro.currentCommission;
        if (!commission) {
            this.targetMobs = ['zombie', 'skeleton', 'spider']; // Default targets
            this.targetKills = 50;
            return;
        }
        
        // Extract mob type from commission
        const commissionType = commission.type.toLowerCase();
        
        // Find matching mob types
        for (const [key, mobs] of Object.entries(this.mobTargets)) {
            if (commissionType.includes(key)) {
                this.targetMobs = mobs;
                this.targetKills = commission.target - commission.current;
                this.log('info', `Targeting ${mobs.join(', ')} mobs (${this.targetKills} needed)`);
                return;
            }
        }
        
        // Fallback to common mobs
        this.targetMobs = ['zombie', 'skeleton', 'spider'];
        this.targetKills = 50;
    }

    /**
     * Find the best mob target to attack
     * @param {Object} bot
     * @returns {Object|null}
     */
    findBestTarget(bot) {
        if (!bot.entity) return null;
        
        const playerPos = bot.entity.position;
        const targets = [];
        
        // Find all hostile mobs within range
        for (const [id, entity] of Object.entries(bot.entities)) {
            if (this.isTargetMob(entity)) {
                const distance = playerPos.distanceTo(entity.position);
                if (distance <= this.searchRadius) {
                    targets.push({ entity, distance });
                }
            }
        }
        
        if (targets.length === 0) return null;
        
        // Sort by priority (closest first, then by mob type)
        targets.sort((a, b) => {
            // Prioritize specific commission targets
            const aIsTarget = this.isCommissionTarget(a.entity);
            const bIsTarget = this.isCommissionTarget(b.entity);
            
            if (aIsTarget && !bIsTarget) return -1;
            if (bIsTarget && !aIsTarget) return 1;
            
            // Then by distance
            return a.distance - b.distance;
        });
        
        return targets[0].entity;
    }

    /**
     * Check if entity is a target mob
     * @param {Object} entity
     * @returns {boolean}
     */
    isTargetMob(entity) {
        if (!entity || !entity.type || entity.type !== 'mob') return false;
        if (!entity.mobType) return false;
        if (entity.health <= 0) return false;
        
        // Check if it's a hostile mob or target mob
        const mobName = entity.mobType.toLowerCase();
        
        const hostileMobs = [
            'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
            'blaze', 'ghast', 'witch', 'slime', 'goblin', 'ghost'
        ];
        
        return hostileMobs.some(hostile => mobName.includes(hostile));
    }

    /**
     * Check if entity is specifically targeted for commission
     * @param {Object} entity
     * @returns {boolean}
     */
    isCommissionTarget(entity) {
        if (!entity || !entity.mobType || !this.targetMobs) return false;
        
        const mobName = entity.mobType.toLowerCase();
        return this.targetMobs.some(target => mobName.includes(target));
    }

    /**
     * Check if target is still valid
     * @param {Object} target
     * @returns {boolean}
     */
    isValidTarget(target) {
        if (!target || !target.position) return false;
        if (target.health <= 0) return false;
        
        const bot = this.getBot();
        if (!bot.entity) return false;
        
        const distance = bot.entity.position.distanceTo(target.position);
        return distance <= this.searchRadius * 1.5; // Allow slightly larger range
    }

    /**
     * Attack the target mob
     * @param {Object} bot
     * @param {Object} target
     */
    async attackTarget(bot, target) {
        try {
            const now = Date.now();
            
            // Check attack cooldown
            if (now - this.lastAttackTime < this.attackCooldown) {
                return;
            }
            
            // Look at the target
            await bot.lookAt(target.position.offset(0, target.height * 0.5, 0));
            
            // Move closer if too far
            const distance = bot.entity.position.distanceTo(target.position);
            if (distance > 4) {
                await this.moveTowardsTarget(bot, target);
                return;
            }
            
            // Attack the target
            await bot.attack(target);
            this.lastAttackTime = now;
            
            this.log('debug', `Attacking ${target.mobType} at distance ${Math.round(distance)}`);
            
            // Check if target was killed
            if (target.health <= 0) {
                this.killCount++;
                this.log('info', `Killed ${target.mobType} (${this.killCount}/${this.targetKills})`);
                this.currentTarget = null;
            }
            
        } catch (error) {
            this.log('warn', 'Failed to attack target:', error);
            this.currentTarget = null;
        }
    }

    /**
     * Move towards the target
     * @param {Object} bot
     * @param {Object} target
     */
    async moveTowardsTarget(bot, target) {
        try {
            if (bot.pathfinder) {
                const goal = new bot.pathfinder.goals.GoalFollow(target, 3);
                bot.pathfinder.setGoal(goal);
            } else {
                // Simple movement towards target
                const direction = target.position.minus(bot.entity.position).normalize();
                
                bot.setControlState('forward', direction.x > 0.1);
                bot.setControlState('back', direction.x < -0.1);
                bot.setControlState('left', direction.z < -0.1);
                bot.setControlState('right', direction.z > 0.1);
                
                // Clear controls after short movement
                setTimeout(() => {
                    bot.clearControlStates();
                }, 1000);
            }
        } catch (error) {
            this.log('debug', 'Failed to move towards target');
        }
    }

    /**
     * Stop attacking current target
     */
    stopAttacking() {
        const bot = this.getBot();
        if (bot) {
            bot.clearControlStates();
            if (bot.pathfinder) {
                bot.pathfinder.setGoal(null);
            }
        }
        this.currentTarget = null;
    }

    /**
     * Search for mobs by moving around
     * @param {Object} bot
     */
    async searchForMobs(bot) {
        // Move to find more mobs
        if (Math.random() < 0.2) { // 20% chance to move
            const directions = [
                { x: 1, z: 0 }, { x: -1, z: 0 },
                { x: 0, z: 1 }, { x: 0, z: -1 },
                { x: 1, z: 1 }, { x: -1, z: -1 },
                { x: 1, z: -1 }, { x: -1, z: 1 }
            ];
            
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const targetPos = {
                x: bot.entity.position.x + direction.x * 10,
                y: bot.entity.position.y,
                z: bot.entity.position.z + direction.z * 10
            };
            
            try {
                if (bot.pathfinder) {
                    const goal = new bot.pathfinder.goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3);
                    await bot.pathfinder.goto(goal);
                } else {
                    // Simple movement
                    bot.setControlState('forward', true);
                    setTimeout(() => {
                        bot.setControlState('forward', false);
                    }, 2000);
                }
            } catch (error) {
                this.log('debug', 'Failed to move while searching for mobs');
            }
        }
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check killing timeout
        if (Date.now() - this.killingStartTime > this.maxKillingTime) {
            this.log('warn', 'Mob killing timeout reached');
            return this.macro.states.MINING;
        }
        
        // Check if target kills reached
        if (this.killCount >= this.targetKills) {
            this.log('info', 'Target kill count reached');
            return this.macro.states.CLAIMING;
        }
        
        // Check if commission is completed
        if (this.macro.currentCommission) {
            const commission = this.getCommissionUtil().getCommissionByType(this.macro.currentCommission.type);
            if (commission && commission.completed) {
                this.log('info', 'Commission completed through mob killing');
                return this.macro.states.CLAIMING;
            }
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = MobKillingState;

