const AbstractFeature = require('../feature/AbstractFeature');
const RotationHandler = require('../handlers/RotationHandler');
const Pathfinder = require('./Pathfinder');
const EntityUtil = require('../util/EntityUtil');
const BlockUtil = require('../util/BlockUtil');
const PlayerUtil = require('../util/PlayerUtil');
const InventoryUtil = require('../util/InventoryUtil');
const KeyBindUtil = require('../util/KeyBindUtil');
const Logger = require('../util/Logger');
const Clock = require('../util/helper/Clock');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const { Vec3 } = require('vec3');

/**
 * AutoMobKiller - Advanced mob targeting and combat system
 * Perfect 1:1 replica of Java AutoMobKiller
 * 
 * Features:
 * - Intelligent mob detection and targeting
 * - Automatic pathfinding to mobs
 * - Combat AI with weapon management
 * - Entity tracking and prediction
 * - Smart mob queue management
 */
class AutoMobKiller extends AbstractFeature {
    constructor(bot) {
        super(bot);
        this.name = 'MobKiller';
        
        // Singleton pattern
        if (!AutoMobKiller._instance) {
            AutoMobKiller._instance = this;
        }
        
        // State management
        this.state = 'STARTING';
        this.mkError = 'NONE';
        
        // Timers
        this.shutdownTimer = new Clock();
        this.queueTimer = new Clock();
        this.recheckTimer = new Clock();
        
        // Mob management
        this.mobQueue = new Set();
        this.mobToKill = new Set();
        this.targetMob = null;
        this.entityLastPosition = null;
        this.pathRetry = 0;
        
        // Debug tracking
        this.debug = new Map();
        
        this.setupEventListeners();
    }
    
    static getInstance(bot) {
        if (!AutoMobKiller._instance && bot) {
            AutoMobKiller._instance = new AutoMobKiller(bot);
        }
        return AutoMobKiller._instance;
    }
    
    /**
     * Start mob killer with specified mobs and weapon
     * @param {Array<string>} mobsToKill - Array of mob names to target
     * @param {string} weaponName - Name of weapon to hold
     */
    start(mobsToKill, weaponName) {
        // Ensure we have the weapon
        if (!InventoryUtil.holdItem(this.bot, weaponName)) {
            Logger.error(this.bot, 'Could not hold MobKiller Weapon');
            this.stopWithError('NO_ENTITIES');
            return;
        }
        
        this.mobToKill.clear();
        mobsToKill.forEach(mob => this.mobToKill.add(mob));
        
        this.mkError = 'NONE';
        this.enabled = true;
        this.debug.clear();
        
        super.start();
        
        Logger.info(this.bot, `MobKiller started for: ${Array.from(mobsToKill).join(', ')}`);
    }
    
    stop() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.mobToKill.clear();
        this.timer.reset();
        this.shutdownTimer.reset();
        this.targetMob = null;
        this.resetStatesAfterStop();
        
        const pathfinder = Pathfinder.getInstance(this.bot);
        pathfinder.stop();
        
        Logger.info(this.bot, `${this.name} stopped`);
    }
    
    stopWithError(error) {
        this.mkError = error;
        this.stop();
    }
    
    resetStatesAfterStop() {
        this.state = 'STARTING';
    }
    
    succeeded() {
        return !this.enabled && this.mkError === 'NONE';
    }
    
    getMkError() {
        return this.mkError;
    }
    
    setupEventListeners() {
        // Main tick event
        this.bot.on('physicTick', () => {
            if (!this.enabled) return;
            this.onTick();
        });
    }
    
    onTick() {
        // Check shutdown timer
        if (this.shutdownTimer.isScheduled() && this.shutdownTimer.passed()) {
            this.stopWithError('NO_ENTITIES');
            Logger.info(this.bot, 'Entities did not spawn');
            return;
        }
        
        // Clear mob queue periodically
        if (this.queueTimer.passed()) {
            Logger.info(this.bot, 'Queue cleared');
            this.mobQueue.clear();
            this.queueTimer.schedule(MightyMinerConfig.getDevMKillTimer());
        }
        
        switch (this.state) {
            case 'STARTING':
                this.handleStartingState();
                break;
            case 'FINDING_MOB':
                this.handleFindingMobState();
                break;
            case 'LOOKING_AT_MOB':
                this.handleLookingAtMobState();
                break;
            case 'KILLING_MOB':
                this.handleKillingMobState();
                break;
        }
    }
    
    handleStartingState() {
        if (this.targetMob) {
            this.mobQueue.add(this.targetMob);
        }
        this.changeState('FINDING_MOB', 0);
        this.recheckTimer.reset();
        Logger.info(this.bot, 'Starting mob search');
    }
    
    handleFindingMobState() {
        if (!this.recheckTimer.isScheduled() || this.recheckTimer.passed()) {
            const mobs = EntityUtil.getEntities(this.bot, Array.from(this.mobToKill), Array.from(this.mobQueue));
            
            if (mobs.length === 0) {
                if (!this.shutdownTimer.isScheduled()) {
                    Logger.info(this.bot, 'Cannot find mobs. Starting a 10 second timer');
                    this.shutdownTimer.schedule(10000);
                }
                return;
            } else if (this.shutdownTimer.isScheduled()) {
                this.shutdownTimer.reset();
            }
            
            // Find best mob with valid position
            let bestMob = null;
            for (const mob of mobs) {
                const mobPos = EntityUtil.getBlockStandingOn(this.bot, mob);
                if (BlockUtil.canStandOn(this.bot, mobPos)) {
                    bestMob = mob;
                    break;
                }
            }
            
            if (!bestMob) {
                Logger.info(this.bot, 'Did not find a mob that has a valid position');
                this.changeState('STARTING', 0);
                return;
            }
            
            if (!this.targetMob || this.targetMob !== bestMob) {
                this.targetMob = bestMob;
                this.entityLastPosition = new Vec3(bestMob.position.x, bestMob.position.y, bestMob.position.z);
                
                const pathfinder = Pathfinder.getInstance(this.bot);
                const nearbyBlock = EntityUtil.nearbyBlock(this.bot, this.targetMob);
                pathfinder.stopAndRequeue(nearbyBlock);
            }
            
            this.recheckTimer.schedule(MightyMinerConfig.getDevMKillTimer());
        }
        
        if (!this.targetMob || !this.entityLastPosition) {
            this.stopWithError('NO_ENTITIES');
            Logger.info(this.bot, 'No target mob or no last position saved');
            return;
        }
        
        const pathfinder = Pathfinder.getInstance(this.bot);
        
        if (!pathfinder.isRunning()) {
            Logger.info(this.bot, 'Pathfinder was not enabled, starting');
            pathfinder.setSprintState(MightyMinerConfig.getMobKillerSprint());
            pathfinder.setInterpolationState(MightyMinerConfig.getMobKillerInterpolate());
            pathfinder.start();
        }
        
        // Check if we're close enough to attack
        const playerNextPos = PlayerUtil.getNextTickPosition(this.bot);
        const targetDistance = playerNextPos.distanceTo(this.targetMob.position);
        
        if (targetDistance < 2.8 && this.bot.canSeeBlock(this.targetMob.position)) { // ~8 squared distance
            Logger.info(this.bot, 'Looking at mob');
            this.changeState('LOOKING_AT_MOB', 0);
            return;
        }
        
        // Check if mob is still alive
        if (!this.targetMob.isValid || this.targetMob.health <= 0) {
            pathfinder.stop();
            this.changeState('STARTING', 0);
            Logger.info(this.bot, 'Target mob is not alive');
            return;
        }
        
        // Check if mob moved too far
        const currentMobPos = new Vec3(this.targetMob.position.x, this.targetMob.position.y, this.targetMob.position.z);
        if (currentMobPos.distanceTo(this.entityLastPosition) > 3) {
            if (++this.pathRetry > 3) {
                this.changeState('STARTING', 0);
                Logger.info(this.bot, 'Target mob moved away, repathing');
                this.pathRetry = 0;
                return;
            }
            
            Logger.info(this.bot, 'Repathing to moved mob');
            this.entityLastPosition = currentMobPos;
            const nearbyBlock = EntityUtil.nearbyBlock(this.bot, this.targetMob);
            pathfinder.stopAndRequeue(nearbyBlock);
            return;
        }
        
        if (!pathfinder.isRunning()) {
            Logger.info(this.bot, 'Pathfinder not enabled');
            this.changeState('STARTING', 0);
            return;
        }
    }
    
    handleLookingAtMobState() {
        const pathfinder = Pathfinder.getInstance(this.bot);
        
        if (!pathfinder.isRunning()) {
            const rotationHandler = RotationHandler.getInstance(this.bot);
            rotationHandler.easeTo({
                target: { entity: this.targetMob },
                duration: 400,
                callback: null
            });
            this.changeState('KILLING_MOB', 0);
            Logger.info(this.bot, 'Rotating to mob');
        }
    }
    
    handleKillingMobState() {
        // Check if we're looking at the target mob
        const entityHit = this.bot.entityAtCursor();
        
        if (entityHit !== this.targetMob) {
            const distanceToMob = this.bot.entity.position.distanceTo(this.targetMob.position);
            const pathfinder = Pathfinder.getInstance(this.bot);
            
            if (distanceToMob < 3 && pathfinder.isRunning()) {
                pathfinder.stop();
                return;
            }
            
            const rotationHandler = RotationHandler.getInstance(this.bot);
            if (!pathfinder.isRunning() && !rotationHandler.isEnabled()) {
                this.changeState('STARTING', 0);
            }
            
            return;
        }
        
        // Attack the mob
        KeyBindUtil.leftClick(this.bot);
        
        const rotationHandler = RotationHandler.getInstance(this.bot);
        rotationHandler.stop();
        
        this.changeState('STARTING', 0);
    }
    
    changeState(newState, timeMs) {
        this.state = newState;
        this.timer.schedule(timeMs);
    }
}

// State enumeration
AutoMobKiller.State = {
    STARTING: 'STARTING',
    WALKING_TO_MOB: 'WALKING_TO_MOB',
    FINDING_MOB: 'FINDING_MOB',
    WAITING_FOR_MOB: 'WAITING_FOR_MOB',
    LOOKING_AT_MOB: 'LOOKING_AT_MOB',
    KILLING_MOB: 'KILLING_MOB'
};

// Error enumeration
AutoMobKiller.MKError = {
    NONE: 'NONE',
    NO_ENTITIES: 'NO_ENTITIES'
};

module.exports = AutoMobKiller;

