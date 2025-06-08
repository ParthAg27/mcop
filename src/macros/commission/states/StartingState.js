const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');

/**
 * Initial state for commission macro - preparation and validation
 * 1:1 replica of StartingState.java
 */
class StartingState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'Starting');
        this.initializationSteps = [
            'checkLocation',
            'checkInventory',
            'updateCommissions',
            'selectCommission'
        ];
        this.currentStep = 0;
        this.stepStartTime = 0;
    }

    /**
     * Enter the starting state
     */
    async onEnter() {
        await super.onEnter();
        this.currentStep = 0;
        this.stepStartTime = Date.now();
        this.log('info', 'Starting commission macro initialization');
    }

    /**
     * Execute initialization steps
     */
    async onTick() {
        if (this.currentStep >= this.initializationSteps.length) {
            return; // All steps completed
        }
        
        const stepName = this.initializationSteps[this.currentStep];
        
        try {
            const completed = await this.executeStep(stepName);
            if (completed) {
                this.log('debug', `Completed step: ${stepName}`);
                this.currentStep++;
                this.stepStartTime = Date.now();
            }
        } catch (error) {
            this.log('error', `Error in step ${stepName}:`, error);
            // Retry step after delay
            if (Date.now() - this.stepStartTime > 5000) {
                this.stepStartTime = Date.now();
            }
        }
    }

    /**
     * Execute a specific initialization step
     * @param {string} stepName
     * @returns {boolean} true if step completed
     */
    async executeStep(stepName) {
        const bot = this.getBot();
        
        switch (stepName) {
            case 'checkLocation':
                return await this.checkLocation(bot);
            
            case 'checkInventory':
                return await this.checkInventory(bot);
            
            case 'updateCommissions':
                return await this.updateCommissions(bot);
            
            case 'selectCommission':
                return await this.selectCommission(bot);
            
            default:
                this.log('warn', `Unknown step: ${stepName}`);
                return true; // Skip unknown steps
        }
    }

    /**
     * Check if bot is in correct location
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkLocation(bot) {
        if (!bot.entity) return false;
        
        // Check if in Dwarven Mines or Crystal Hollows
        const position = bot.entity.position;
        
        // For now, assume we're in correct location
        // TODO: Add proper location detection
        this.log('info', `Current position: ${position.x}, ${position.y}, ${position.z}`);
        return true;
    }

    /**
     * Check inventory for required tools
     * @param {Object} bot
     * @returns {boolean}
     */
    async checkInventory(bot) {
        if (!bot.inventory) return false;
        
        // Check for pickaxe
        const pickaxe = bot.inventory.items().find(item => 
            item.name.includes('pickaxe') || 
            item.name.includes('drill')
        );
        
        if (!pickaxe) {
            this.log('warn', 'No pickaxe or drill found in inventory');
            return false;
        }
        
        this.log('info', `Found mining tool: ${pickaxe.name}`);
        return true;
    }

    /**
     * Update commission data
     * @param {Object} bot
     * @returns {boolean}
     */
    async updateCommissions(bot) {
        const commissionUtil = this.getCommissionUtil();
        await commissionUtil.updateCommissions(bot);
        
        const commissions = commissionUtil.getActiveCommissions();
        this.log('info', `Found ${commissions.length} active commissions`);
        
        return true;
    }

    /**
     * Select the best commission to work on
     * @param {Object} bot
     * @returns {boolean}
     */
    async selectCommission(bot) {
        const bestCommission = this.macro.getBestCommission();
        
        if (!bestCommission) {
            this.log('warn', 'No suitable commission found');
            return false;
        }
        
        this.macro.setCurrentCommission(bestCommission);
        this.log('info', `Selected commission: ${bestCommission.type}`);
        return true;
    }

    /**
     * Check if should transition to next state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        // If all initialization steps completed, move to next state
        if (this.currentStep >= this.initializationSteps.length) {
            if (this.macro.currentCommission) {
                return this.macro.states.MINING;
            } else {
                this.log('warn', 'No commission selected, retrying...');
                this.currentStep = 0; // Restart initialization
                return null;
            }
        }
        
        return null;
    }
}

module.exports = StartingState;

