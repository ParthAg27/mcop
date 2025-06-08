const AbstractFeature = require('../feature/AbstractFeature');
const RotationHandler = require('../handlers/RotationHandler');
const CommissionUtil = require('../util/CommissionUtil');
const EntityUtil = require('../util/EntityUtil');
const InventoryUtil = require('../util/InventoryUtil');
const KeyBindUtil = require('../util/KeyBindUtil');
const Logger = require('../util/Logger');
const MightyMinerConfig = require('../config/MightyMinerConfig');

/**
 * AutoCommissionClaim - Automatic commission claiming system
 * Perfect 1:1 replica of Java AutoCommissionClaim
 * 
 * Features:
 * - Automatic emissary detection and interaction
 * - Royal Pigeon support for commission claiming
 * - Smart GUI verification and navigation
 * - Commission completion detection
 * - Error handling and retry logic
 */
class AutoCommissionClaim extends AbstractFeature {
    constructor(bot) {
        super(bot);
        this.name = 'AutoCommissionClaim';
        
        // Singleton pattern
        if (!AutoCommissionClaim._instance) {
            AutoCommissionClaim._instance = this;
        }
        
        // State management
        this.state = 'STARTING';
        this.claimError = 'NONE';
        this.emissary = null;
        this.nextComm = [];
        this.retry = 0;
        this.commClaimMethod = 0;
        
        this.setupEventListeners();
    }
    
    static getInstance(bot) {
        if (!AutoCommissionClaim._instance && bot) {
            AutoCommissionClaim._instance = new AutoCommissionClaim(bot);
        }
        return AutoCommissionClaim._instance;
    }
    
    start() {
        // Determine claim method based on current macro
        const macroManager = require('../macro/MacroManager');
        const currentMacro = macroManager.getInstance(this.bot).getCurrentMacro();
        
        this.commClaimMethod = (currentMacro && currentMacro.name === 'GlacialMacro') ? 1 : 
                              MightyMinerConfig.getCommClaimMethod();
        
        this.enabled = true;
        this.nextComm = null;
        this.claimError = 'NONE';
        this.retry = 0;
        
        Logger.info(this.bot, `${this.name} started with method: ${this.commClaimMethod}`);
    }
    
    stop() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.emissary = null;
        this.timer.reset();
        this.resetStatesAfterStop();
        
        Logger.info(this.bot, `${this.name} stopped`);
    }
    
    stopWithError(error) {
        this.claimError = error;
        this.stop();
    }
    
    resetStatesAfterStop() {
        this.state = 'STARTING';
        this.retry = 0;
    }
    
    shouldNotCheckForFailsafe() {
        return true;
    }
    
    succeeded() {
        return !this.enabled && this.claimError === 'NONE';
    }
    
    getClaimError() {
        return this.claimError;
    }
    
    getNextComm() {
        return this.nextComm;
    }
    
    setupEventListeners() {
        // Main tick event
        this.bot.on('physicTick', () => {
            if (!this.enabled) return;
            this.onTick();
        });
        
        // Chat events for pigeon cooldown detection
        this.bot.on('message', (message) => {
            this.onChat(message);
        });
    }
    
    onTick() {
        if (this.retry > 3) {
            Logger.error(this.bot, 'Tried too many times but failed, stopping');
            this.stopWithError('INACCESSIBLE_NPC');
            return;
        }
        
        switch (this.state) {
            case 'STARTING':
                this.handleStartingState();
                break;
            case 'ROTATING':
                this.handleRotatingState();
                break;
            case 'OPENING':
                this.handleOpeningState();
                break;
            case 'VERIFYING_GUI':
                this.handleVerifyingGuiState();
                break;
            case 'CLAIMING':
                this.handleClaimingState();
                break;
            case 'NEXT_COMM':
                this.handleNextCommState();
                break;
            case 'ENDING':
                this.handleEndingState();
                break;
        }
    }
    
    handleStartingState() {
        let time = 400;
        
        switch (this.commClaimMethod) {
            case 0: // Emissary method
                time = 0;
                break;
            case 1: // Royal Pigeon method
                if (!InventoryUtil.holdItem(this.bot, 'Royal Pigeon')) {
                    this.stopWithError('NO_ITEMS');
                    return;
                }
                break;
        }
        
        this.swapState('ROTATING', time);
    }
    
    handleRotatingState() {
        if (this.isTimerRunning()) return;
        
        if (this.commClaimMethod === 0) {
            // Find closest emissary
            this.emissary = CommissionUtil.getClosestEmissary(this.bot);
            
            if (this.emissary) {
                const distance = this.bot.entity.position.distanceTo(this.emissary.position);
                Logger.info(this.bot, `Found Emissary: ${this.emissary.username || this.emissary.name}`);
                
                if (distance > 4) { // Distance squared check in original was 16, so sqrt(16) = 4
                    Logger.error(this.bot, `Emissary is too far away: ${distance}`);
                    this.stopWithError('INACCESSIBLE_NPC');
                    return;
                } else {
                    Logger.info(this.bot, `Rotating to Emissary: ${this.emissary.username || this.emissary.name}`);
                    const rotationHandler = RotationHandler.getInstance(this.bot);
                    rotationHandler.easeTo({
                        target: { entity: this.emissary },
                        duration: 500,
                        type: 'CLIENT',
                        callback: null
                    });
                }
            } else {
                Logger.error(this.bot, `Could not find nearby Emissary. Current position: ${this.bot.entity.position}`);
                this.stopWithError('NPC_NOT_UNLOCKED');
                return;
            }
        }
        
        this.swapState('OPENING', 2000);
    }
    
    handleOpeningState() {
        const entityLookingAt = EntityUtil.getEntityLookingAt(this.bot);
        let time = 5000;
        
        switch (this.commClaimMethod) {
            case 0: // Emissary method
                const rotationHandler = RotationHandler.getInstance(this.bot);
                if (rotationHandler.isEnabled() || !entityLookingAt) {
                    return;
                }
                
                // Interact with emissary
                if (entityLookingAt === this.emissary) {
                    KeyBindUtil.leftClick(this.bot);
                } else {
                    // Direct interaction if not looking at correct entity
                    this.bot.attack(this.emissary);
                }
                break;
                
            case 1: // Royal Pigeon method
                KeyBindUtil.rightClick(this.bot);
                break;
        }
        
        Logger.info(this.bot, `Scheduled timer for: ${time}ms`);
        this.swapState('VERIFYING_GUI', time);
    }
    
    handleVerifyingGuiState() {
        if (this.hasTimerEnded()) {
            const inventoryName = InventoryUtil.getInventoryName(this.bot);
            Logger.error(this.bot, `Opened a Different Inventory Named: ${inventoryName}`);
            this.stopWithError('INACCESSIBLE_NPC');
            return;
        }
        
        switch (this.commClaimMethod) {
            case 0:
            case 1:
                const window = this.bot.currentWindow;
                const inventoryName = InventoryUtil.getInventoryName(this.bot);
                
                if (!window || window.type !== 'minecraft:chest' || !inventoryName.includes('Commissions')) {
                    return; // Wait for correct GUI
                }
                
                this.swapState('CLAIMING', 500);
                break;
        }
    }
    
    handleClaimingState() {
        if (this.isTimerRunning()) return;
        
        const slotToClick = CommissionUtil.getClaimableCommissionSlot(this.bot);
        let nextState;
        
        if (slotToClick !== -1) {
            InventoryUtil.clickContainerSlot(this.bot, slotToClick, 'LEFT', 'PICKUP');
            nextState = 'CLAIMING';
        } else {
            Logger.info(this.bot, 'No Commission To Claim');
            nextState = 'NEXT_COMM';
        }
        
        const delay = MightyMinerConfig.getRandomGuiWaitDelay();
        this.swapState(nextState, delay);
    }
    
    handleNextCommState() {
        if (this.isTimerRunning()) return;
        
        const window = this.bot.currentWindow;
        if (window && window.type === 'minecraft:chest') {
            this.nextComm = CommissionUtil.getCommissionFromContainer(this.bot, window);
        }
        
        this.swapState('ENDING', 0);
    }
    
    handleEndingState() {
        if (this.isTimerRunning()) return;
        
        InventoryUtil.closeScreen(this.bot);
        this.stop();
    }
    
    onChat(message) {
        if (!this.enabled || this.state !== 'CLAIMING') return;
        
        const text = message.toString();
        if (text.startsWith('This ability is on cooldown for ')) {
            this.retry++;
            Logger.info(this.bot, 'Pigeon Cooldown Detected, Waiting for 5 Seconds');
            this.swapState('OPENING', 5000);
        }
    }
    
    swapState(newState, timeMs) {
        this.state = newState;
        if (timeMs === 0) {
            this.timer.reset();
        } else {
            this.timer.schedule(timeMs);
        }
    }
    
    hasTimerEnded() {
        return this.timer.isScheduled() && this.timer.passed();
    }
    
    isTimerRunning() {
        return this.timer.isScheduled() && !this.timer.passed();
    }
}

// State enumeration
AutoCommissionClaim.State = {
    STARTING: 'STARTING',
    ROTATING: 'ROTATING',
    OPENING: 'OPENING',
    VERIFYING_GUI: 'VERIFYING_GUI',
    CLAIMING: 'CLAIMING',
    NEXT_COMM: 'NEXT_COMM',
    ENDING: 'ENDING'
};

// Error enumeration
AutoCommissionClaim.ClaimError = {
    NONE: 'NONE',
    INACCESSIBLE_NPC: 'INACCESSIBLE_NPC',
    NO_ITEMS: 'NO_ITEMS',
    TIMEOUT: 'TIMEOUT',
    NPC_NOT_UNLOCKED: 'NPC_NOT_UNLOCKED'
};

module.exports = AutoCommissionClaim;

