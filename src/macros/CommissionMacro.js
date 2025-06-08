const AbstractMacro = require('./AbstractMacro');
const CommissionUtil = require('../utils/CommissionUtil');
const PlayerUtil = require('../utils/PlayerUtil');
const BlockUtil = require('../utils/BlockUtil');
const Clock = require('../Clock');
const Logger = require('../Logger');

// Import commission states
const StartingState = require('./commission/states/StartingState');
const GettingStatsState = require('./commission/states/GettingStatsState');
const MiningState = require('./commission/states/MiningState');
const ClaimingCommissionState = require('./commission/states/ClaimingCommissionState');
const WarpingState = require('./commission/states/WarpingState');
const PathingState = require('./commission/states/PathingState');
const RefuelState = require('./commission/states/RefuelState');
const MobKillingState = require('./commission/states/MobKillingState');

/**
 * Advanced commission automation macro
 * 1:1 replica of CommissionMacro.java
 */
class CommissionMacro extends AbstractMacro {
    constructor() {
        super('Commission');
        this.logger = new Logger('CommissionMacro');
        this.commissionUtil = new CommissionUtil();
        
        // Initialize states
        this.states = {
            STARTING: new StartingState(this),
            GETTING_STATS: new GettingStatsState(this),
            MINING: new MiningState(this),
            CLAIMING: new ClaimingCommissionState(this),
            WARPING: new WarpingState(this),
            PATHING: new PathingState(this),
            REFUEL: new RefuelState(this),
            MOB_KILLING: new MobKillingState(this)
        };
        
        this.currentState = this.states.STARTING;
        
        // Commission tracking
        this.currentCommission = null;
        this.completedCommissions = [];
        this.sessionStats = {
            startTime: 0,
            commissionsCompleted: 0,
            totalMined: 0,
            experienceGained: 0,
            coinsEarned: 0
        };
        
        // Settings
        this.settings = {
            preferredCommissions: ['mithril', 'gemstone', 'hardStone'],
            autoClaimRewards: true,
            autoRefuel: true,
            maxCommissionsPerSession: 50,
            breakBetweenCommissions: 5000, // 5 seconds
            enableMobKilling: true,
            targetLocation: 'dwarven_mines'
        };
        
        // Timing
        this.lastCommissionCheck = 0;
        this.lastStatUpdate = 0;
        this.stateChangeTime = 0;
        
        this.logger.info('CommissionMacro initialized');
    }

    /**
     * Start the commission macro
     */
    async onEnable() {
        this.sessionStats.startTime = Date.now();
        this.currentState = this.states.STARTING;
        this.stateChangeTime = Date.now();
        
        this.logger.info('Commission macro started');
        await this.currentState.onEnter();
    }

    /**
     * Stop the commission macro
     */
    async onDisable() {
        if (this.currentState && this.currentState.onExit) {
            await this.currentState.onExit();
        }
        
        this.logSessionStats();
        this.logger.info('Commission macro stopped');
    }

    /**
     * Main macro execution loop
     */
    async onTick() {
        if (!this.enabled || !this.bot) return;
        
        try {
            // Update commission data
            await this.updateCommissionData();
            
            // Update session statistics
            this.updateSessionStats();
            
            // Execute current state
            if (this.currentState && this.currentState.onTick) {
                await this.currentState.onTick();
            }
            
            // Check for state transitions
            await this.checkStateTransitions();
            
        } catch (error) {
            this.logger.error('Error in commission macro tick:', error);
            await this.handleError(error);
        }
    }

    /**
     * Update commission data from game
     */
    async updateCommissionData() {
        const now = Date.now();
        if (now - this.lastCommissionCheck < 2000) return; // Update every 2 seconds
        
        this.lastCommissionCheck = now;
        await this.commissionUtil.updateCommissions(this.bot);
    }

    /**
     * Update session statistics
     */
    updateSessionStats() {
        const now = Date.now();
        if (now - this.lastStatUpdate < 5000) return; // Update every 5 seconds
        
        this.lastStatUpdate = now;
        
        // Update stats based on current commission progress
        if (this.currentCommission) {
            const commission = this.commissionUtil.getCommissionByType(this.currentCommission.type);
            if (commission && commission.completed && !this.completedCommissions.includes(commission)) {
                this.sessionStats.commissionsCompleted++;
                this.completedCommissions.push(commission);
                this.logger.info(`Commission completed: ${commission.type}`);
            }
        }
    }

    /**
     * Check for state transitions
     */
    async checkStateTransitions() {
        if (!this.currentState || !this.currentState.shouldTransition) return;
        
        const nextState = await this.currentState.shouldTransition();
        if (nextState && nextState !== this.currentState) {
            await this.transitionToState(nextState);
        }
    }

    /**
     * Transition to a new state
     * @param {Object} newState
     */
    async transitionToState(newState) {
        if (this.currentState === newState) return;
        
        const oldStateName = this.currentState.constructor.name;
        const newStateName = newState.constructor.name;
        
        this.logger.info(`State transition: ${oldStateName} -> ${newStateName}`);
        
        // Exit current state
        if (this.currentState.onExit) {
            await this.currentState.onExit();
        }
        
        // Set new state
        this.currentState = newState;
        this.stateChangeTime = Date.now();
        
        // Enter new state
        if (this.currentState.onEnter) {
            await this.currentState.onEnter();
        }
    }

    /**
     * Get the best available commission to work on
     * @returns {Object|null}
     */
    getBestCommission() {
        return this.commissionUtil.getBestCommission(this.settings.preferredCommissions);
    }

    /**
     * Set the current commission
     * @param {Object} commission
     */
    setCurrentCommission(commission) {
        this.currentCommission = commission;
        this.logger.info(`Working on commission: ${commission.type} (${commission.current}/${commission.target})`);
    }

    /**
     * Check if we should stop the macro
     * @returns {boolean}
     */
    shouldStop() {
        // Check session limits
        if (this.sessionStats.commissionsCompleted >= this.settings.maxCommissionsPerSession) {
            this.logger.info('Reached maximum commissions per session');
            return true;
        }
        
        // Check if no commissions available
        const activeCommissions = this.commissionUtil.getActiveCommissions();
        if (activeCommissions.length === 0) {
            this.logger.info('No active commissions available');
            return true;
        }
        
        return false;
    }

    /**
     * Handle errors during macro execution
     * @param {Error} error
     */
    async handleError(error) {
        this.logger.error('Commission macro error:', error);
        
        // Try to recover or transition to a safe state
        if (this.states.STARTING) {
            await this.transitionToState(this.states.STARTING);
        }
    }

    /**
     * Log session statistics
     */
    logSessionStats() {
        const duration = Date.now() - this.sessionStats.startTime;
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        
        this.logger.info('=== Session Statistics ===');
        this.logger.info(`Duration: ${hours}h ${minutes}m`);
        this.logger.info(`Commissions Completed: ${this.sessionStats.commissionsCompleted}`);
        this.logger.info(`Total Mined: ${this.sessionStats.totalMined}`);
        this.logger.info(`Experience Gained: ${this.sessionStats.experienceGained}`);
        this.logger.info(`Coins Earned: ${this.sessionStats.coinsEarned}`);
    }

    /**
     * Get current state name
     * @returns {string}
     */
    getCurrentStateName() {
        return this.currentState ? this.currentState.constructor.name : 'Unknown';
    }

    /**
     * Get time in current state
     * @returns {number}
     */
    getTimeInState() {
        return Date.now() - this.stateChangeTime;
    }

    /**
     * Get macro statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.sessionStats,
            currentState: this.getCurrentStateName(),
            timeInState: this.getTimeInState(),
            currentCommission: this.currentCommission,
            commissionStats: this.commissionUtil.getStats(),
            activeCommissions: this.commissionUtil.getActiveCommissions().length,
            completedThisSession: this.completedCommissions.length
        };
    }

    /**
     * Update macro settings
     * @param {Object} newSettings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.logger.info('Commission macro settings updated');
    }

    /**
     * Get current settings
     * @returns {Object}
     */
    getSettings() {
        return { ...this.settings };
    }
}

module.exports = CommissionMacro;

