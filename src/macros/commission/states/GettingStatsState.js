const CommissionMacroState = require('./CommissionMacroState');
const ScoreboardUtil = require('../../../utils/ScoreboardUtil');
const TablistUtil = require('../../../utils/TablistUtil');

/**
 * State for getting player/commission statistics
 * 1:1 replica of GettingStatsState.java
 */
class GettingStatsState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'GettingStats');
        this.statsCollected = false;
        this.maxDuration = 30000; // 30 seconds max
        this.statChecks = [
            'commissionProgress',
            'playerStats',
            'inventory',
            'location'
        ];
        this.currentCheck = 0;
    }

    /**
     * Enter stats collection state
     */
    async onEnter() {
        await super.onEnter();
        this.statsCollected = false;
        this.currentCheck = 0;
        this.log('info', 'Starting stats collection');
    }

    /**
     * Execute stats collection
     */
    async onTick() {
        if (this.statsCollected) return;
        
        try {
            const checkName = this.statChecks[this.currentCheck];
            if (checkName) {
                const completed = await this.executeCheck(checkName);
                if (completed) {
                    this.currentCheck++;
                    
                    // All checks completed
                    if (this.currentCheck >= this.statChecks.length) {
                        this.statsCollected = true;
                        this.log('info', 'Stats collection completed');
                    }
                }
            }
        } catch (error) {
            this.log('error', 'Error collecting stats:', error);
        }
    }

    /**
     * Execute a specific stats check
     * @param {string} checkName
     * @returns {boolean}
     */
    async executeCheck(checkName) {
        const bot = this.getBot();
        
        switch (checkName) {
            case 'commissionProgress':
                return await this.checkCommissionProgress(bot);
            
            case 'playerStats':
                return await this.checkPlayerStats(bot);
            
            case 'inventory':
                return await this.checkInventory(bot);
            
            case 'location':
                return await this.checkLocation(bot);
            
            default:
                this.log('warn', `Unknown stats check: ${checkName}`);
                return true;
        }
    }

    /**
     * Check commission progress from scoreboard/tablist
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkCommissionProgress(bot) {
        try {
            // Update commission data
            await this.getCommissionUtil().updateCommissions(bot);
            
            const commissions = this.getCommissionUtil().getCommissions();
            this.log('info', `Found ${commissions.length} commissions`);
            
            // Log commission details
            for (const commission of commissions) {
                this.log('debug', 
                    `Commission: ${commission.type} - ${commission.current}/${commission.target} ` +
                    `(${Math.round(commission.progress * 100)}%)`);
            }
            
            return true;
        } catch (error) {
            this.log('error', 'Failed to check commission progress:', error);
            return false;
        }
    }

    /**
     * Check player statistics
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkPlayerStats(bot) {
        try {
            // Get player level, health, etc.
            const health = bot.health;
            const food = bot.food;
            const experience = bot.experience;
            
            this.log('info', `Player stats - Health: ${health}, Food: ${food}, XP: ${experience.level}`);
            
            // Update macro session stats
            this.macro.sessionStats.experienceGained = experience.points;
            
            return true;
        } catch (error) {
            this.log('error', 'Failed to check player stats:', error);
            return false;
        }
    }

    /**
     * Check inventory contents
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkInventory(bot) {
        try {
            if (!bot.inventory) return false;
            
            const items = bot.inventory.items();
            const totalItems = items.length;
            const emptySlots = 36 - totalItems; // Assuming 36 slot inventory
            
            this.log('info', `Inventory: ${totalItems} items, ${emptySlots} empty slots`);
            
            // Check for important items
            const pickaxe = items.find(item => 
                item.name.includes('pickaxe') || item.name.includes('drill'));
            
            if (pickaxe) {
                this.log('debug', `Mining tool: ${pickaxe.name} (${pickaxe.durabilityUsed || 0}/${pickaxe.maxDurability || 'infinite'})`);
            }
            
            // Check if inventory is getting full
            if (emptySlots < 5) {
                this.log('warn', 'Inventory is getting full');
            }
            
            return true;
        } catch (error) {
            this.log('error', 'Failed to check inventory:', error);
            return false;
        }
    }

    /**
     * Check current location
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkLocation(bot) {
        try {
            if (!bot.entity) return false;
            
            const position = bot.entity.position;
            const dimension = bot.game ? bot.game.dimension : 'unknown';
            
            this.log('info', `Location: ${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)} (${dimension})`);
            
            // Check if in mining area
            const inMiningArea = this.isInMiningArea(position);
            if (!inMiningArea) {
                this.log('warn', 'Not in expected mining area');
            }
            
            return true;
        } catch (error) {
            this.log('error', 'Failed to check location:', error);
            return false;
        }
    }

    /**
     * Check if position is in a mining area
     * @param {Object} position
     * @returns {boolean}
     */
    isInMiningArea(position) {
        // Basic check - could be enhanced with specific area detection
        return position.y < 100; // Underground
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // If stats collected, move to mining
        if (this.statsCollected) {
            if (this.macro.currentCommission) {
                return this.macro.states.MINING;
            } else {
                return this.macro.states.STARTING;
            }
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = GettingStatsState;

