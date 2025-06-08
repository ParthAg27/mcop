const AbstractFeature = require('../feature/AbstractFeature');
const RotationHandler = require('../handlers/RotationHandler');
const Pathfinder = require('./Pathfinder');
const BlockUtil = require('../util/BlockUtil');
const PlayerUtil = require('../util/PlayerUtil');
const InventoryUtil = require('../util/InventoryUtil');
const KeyBindUtil = require('../util/KeyBindUtil');
const Logger = require('../util/Logger');
const { Vec3 } = require('vec3');

/**
 * AutoChestUnlocker - Advanced treasure chest automation system
 * Perfect 1:1 replica of Java AutoChestUnlocker
 * 
 * Features:
 * - Automatic chest detection and queueing
 * - Intelligent pathfinding to chests
 * - Particle-based chest solving
 * - Line-of-sight validation
 * - State machine architecture
 */
class AutoChestUnlocker extends AbstractFeature {
    constructor(bot) {
        super(bot);
        this.name = 'TreasureChestUnlocker';
        
        // Static instances for shared state
        if (!AutoChestUnlocker._instance) {
            AutoChestUnlocker._instance = this;
        }
        
        // State management
        this.state = 'STARTING';
        this.chestFailure = 'NONE';
        this.particlePos = null;
        this.particleSpawned = true;
        this.chestSolved = false;
        this.chestSolving = null;
        this.walkableBlocks = [];
        this.clickChest = false;
        
        // Static chest queue shared across instances
        if (!AutoChestUnlocker.chestQueue) {
            AutoChestUnlocker.chestQueue = [];
        }
        
        this.setupEventListeners();
    }
    
    static getInstance(bot) {
        if (!AutoChestUnlocker._instance) {
            AutoChestUnlocker._instance = new AutoChestUnlocker(bot);
        }
        return AutoChestUnlocker._instance;
    }
    
    static get chestQueue() {
        return AutoChestUnlocker._chestQueue || [];
    }
    
    static set chestQueue(value) {
        AutoChestUnlocker._chestQueue = value;
    }
    
    /**
     * Start chest unlocker with specified item and click mode
     * @param {string} itemToHold - Item to hold (empty string for none)
     * @param {boolean} clickChest - Whether to click chest or solve via particles
     */
    start(itemToHold = '', clickChest = false) {
        if (itemToHold && itemToHold.length > 0) {
            // Try to hold the specified item
            InventoryUtil.holdItem(this.bot, itemToHold);
        }
        
        this.chestFailure = 'NONE';
        this.clickChest = clickChest;
        this.enabled = true;
        
        Logger.info(this.bot, `${this.name} started with clickChest: ${clickChest}`);
    }
    
    stop() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.particlePos = null;
        this.chestSolving = null;
        this.walkableBlocks = [];
        this.clickChest = false;
        this.resetStatesAfterStop();
        
        Logger.info(this.bot, `${this.name} stopped`);
    }
    
    stopWithFailure(failure) {
        this.chestFailure = failure;
        this.stop();
    }
    
    resetStatesAfterStop() {
        this.state = 'STARTING';
    }
    
    changeState(newState, timeMs = 0) {
        this.state = newState;
        if (timeMs === 0) {
            this.timer.reset();
        } else {
            this.timer.schedule(timeMs);
        }
    }
    
    setupEventListeners() {
        // Main tick event
        this.bot.on('physicTick', () => {
            if (!this.enabled) return;
            this.onTick();
        });
        
        // Block change events for chest detection
        this.bot.on('blockUpdate', (oldBlock, newBlock, position) => {
            this.onBlockChange(oldBlock, newBlock, position);
        });
        
        // Particle events for chest solving
        this.bot.on('particle', (particle) => {
            this.onParticleSpawn(particle);
        });
        
        // Chat events for chest solving confirmation
        this.bot.on('message', (message) => {
            this.onChat(message);
        });
        
        // World events
        this.bot.on('spawn', () => {
            AutoChestUnlocker.chestQueue.length = 0; // Clear queue on world change
        });
    }
    
    onTick() {
        switch (this.state) {
            case 'STARTING':
                this.handleStartingState();
                break;
            case 'FINDING_WALKABLE_BLOCKS':
                this.handleFindingWalkableBlocksState();
                break;
            case 'WALKING':
                this.handleWalkingState();
                break;
            case 'WAITING':
                this.handleWaitingState();
                break;
            case 'LOOKING':
                this.handleLookingState();
                break;
            case 'VERIFYING_ROTATION':
                this.handleVerifyingRotationState();
                break;
            case 'CLICKING':
                this.handleClickingState();
                break;
            case 'ENDING':
                this.handleEndingState();
                break;
        }
    }
    
    handleStartingState() {
        if (AutoChestUnlocker.chestQueue.length === 0) {
            Logger.info(this.bot, 'Chest queue is empty');
            this.changeState('ENDING', 0);
            return;
        }
        
        // Sort chests by distance to player
        const playerPos = this.bot.entity.position;
        AutoChestUnlocker.chestQueue.sort((a, b) => {
            const distA = playerPos.distanceTo(new Vec3(a.x + 0.5, a.y + 0.5, a.z + 0.5));
            const distB = playerPos.distanceTo(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5));
            return distA - distB;
        });
        
        this.chestSolving = AutoChestUnlocker.chestQueue.shift();
        const playerEyePos = PlayerUtil.getPlayerEyePos(this.bot);
        const chestCenter = new Vec3(this.chestSolving.x + 0.5, this.chestSolving.y + 0.5, this.chestSolving.z + 0.5);
        
        if (playerEyePos.distanceTo(chestCenter) > 4) {
            this.changeState('FINDING_WALKABLE_BLOCKS', 0);
        } else {
            this.changeState('LOOKING', 0);
        }
    }
    
    handleFindingWalkableBlocksState() {
        const walkablePositions = [];
        
        // Search for walkable blocks around the chest
        for (let y = -4; y < 0; y++) {
            for (let x = -1; x < 2; x++) {
                for (let z = -1; z < 2; z++) {
                    const newPos = {
                        x: this.chestSolving.x + x,
                        y: this.chestSolving.y + y,
                        z: this.chestSolving.z + z
                    };
                    
                    if (BlockUtil.canStandOn(this.bot, newPos)) {
                        walkablePositions.push(newPos);
                    }
                }
            }
        }
        
        // Sort by distance to player
        const playerPos = this.bot.entity.position;
        walkablePositions.sort((a, b) => {
            const distA = playerPos.distanceTo(new Vec3(a.x, a.y, a.z));
            const distB = playerPos.distanceTo(new Vec3(b.x, b.y, b.z));
            return distA - distB;
        });
        
        this.walkableBlocks = walkablePositions;
        this.changeState('WALKING', 0);
        Logger.info(this.bot, `Found ${walkablePositions.length} walkable blocks`);
    }
    
    handleWalkingState() {
        if (this.walkableBlocks.length === 0) {
            Logger.error(this.bot, 'No walkable blocks around chest, ignoring');
            this.changeState('STARTING', 0);
            return;
        }
        
        const target = this.walkableBlocks.shift();
        Logger.info(this.bot, `Walking to position: ${target.x}, ${target.y}, ${target.z}`);
        
        // Use pathfinder to navigate
        const pathfinder = Pathfinder.getInstance(this.bot);
        const currentPos = PlayerUtil.getBlockStandingOn(this.bot);
        
        pathfinder.setInterpolationState(true);
        pathfinder.queue(currentPos, target);
        pathfinder.start();
        
        this.changeState('WAITING', 0);
    }
    
    handleWaitingState() {
        const pathfinder = Pathfinder.getInstance(this.bot);
        
        if (pathfinder.isRunning()) {
            const playerEyePos = PlayerUtil.getPlayerEyePos(this.bot);
            const chestCenter = new Vec3(this.chestSolving.x + 0.5, this.chestSolving.y + 0.5, this.chestSolving.z + 0.5);
            
            if (playerEyePos.distanceTo(chestCenter) < 3) {
                Logger.info(this.bot, 'Close enough to chest, stopping pathfinder');
                pathfinder.stop();
                this.changeState('LOOKING', 5000);
            }
        } else {
            if (pathfinder.succeeded()) {
                Logger.info(this.bot, 'Pathfinder succeeded');
                this.changeState('LOOKING', 5000);
            } else {
                Logger.error(this.bot, 'Failed walking to block, retrying');
                this.changeState('WALKING', 0);
            }
        }
    }
    
    handleLookingState() {
        const lookingAt = BlockUtil.getBlockLookingAt(this.bot);
        const rotationHandler = RotationHandler.getInstance(this.bot);
        
        // Check if we're looking at the chest
        if (!this.isPositionEqual(lookingAt, this.chestSolving) && !rotationHandler.isEnabled()) {
            const closestVisibleSide = BlockUtil.getClosestVisibleSidePos(this.bot, this.chestSolving);
            rotationHandler.easeTo({
                target: { position: closestVisibleSide },
                duration: 400,
                callback: null
            });
        }
        
        if (this.clickChest) {
            this.changeState('VERIFYING_ROTATION', 3000);
            return;
        }
        
        if (this.hasTimerEnded()) {
            Logger.error(this.bot, 'No particle spawned in over 2 seconds');
            this.changeState('STARTING', 0);
            return;
        }
        
        if (this.chestSolved) {
            Logger.info(this.bot, 'Chest solved, stopping rotation and going to next');
            rotationHandler.stop();
            this.changeState('STARTING', 0);
            this.chestSolved = false;
            return;
        }
        
        if (this.particleSpawned && this.particlePos) {
            rotationHandler.stopFollowingTarget();
            rotationHandler.easeTo({
                target: { position: this.particlePos },
                duration: 400,
                followTarget: true,
                callback: null
            });
            this.timer.schedule(5000);
            this.particleSpawned = false;
        }
    }
    
    handleVerifyingRotationState() {
        if (this.hasTimerEnded()) {
            Logger.error(this.bot, 'Could not look at chest');
            this.changeState('STARTING', 0);
            return;
        }
        
        const lookingAt = BlockUtil.getBlockLookingAt(this.bot);
        const rotationHandler = RotationHandler.getInstance(this.bot);
        
        if (this.isPositionEqual(lookingAt, this.chestSolving)) {
            rotationHandler.stop();
            KeyBindUtil.releaseAllExcept(this.bot);
            this.changeState('CLICKING', 250);
        } else if (!rotationHandler.isEnabled()) {
            KeyBindUtil.holdThese(this.bot, ['attack']);
        }
    }
    
    handleClickingState() {
        if (this.isTimerRunning()) return;
        
        KeyBindUtil.rightClick(this.bot);
        this.changeState('STARTING', 0);
    }
    
    handleEndingState() {
        Logger.info(this.bot, 'Ending chest unlocker');
        this.stop();
    }
    
    onParticleSpawn(particle) {
        if (!this.enabled || this.state !== 'LOOKING' || this.clickChest) return;
        
        // Check for critical hit particles near the chest
        if (particle.id === 9 && this.bot.entity.position.distanceTo(particle.position) < 8) { // ID 9 = crit particles
            const chestBlock = this.bot.blockAt(this.chestSolving);
            if (chestBlock && chestBlock.name === 'chest') {
                // Verify particle is in front of chest
                const chestFacing = this.getChestFacing(chestBlock);
                const expectedPos = this.getOffsetPosition(this.chestSolving, chestFacing);
                
                if (this.isPositionEqual(particle.position, expectedPos)) {
                    this.particlePos = particle.position;
                    this.particleSpawned = true;
                }
            }
        }
    }
    
    onBlockChange(oldBlock, newBlock, position) {
        if (!this.bot.entity) return;
        
        const playerPos = this.bot.entity.position;
        if (playerPos.distanceTo(position) > 8) return;
        
        // Chest spawned
        if ((!oldBlock || oldBlock.name === 'air') && newBlock && newBlock.name === 'chest') {
            AutoChestUnlocker.chestQueue.push(position);
        }
        // Chest removed
        else if (oldBlock && oldBlock.name === 'chest' && (!newBlock || newBlock.name === 'air')) {
            if (this.isPositionEqual(position, this.chestSolving)) {
                Logger.info(this.bot, 'Chest removed - solved');
                this.chestSolved = true;
            } else {
                Logger.info(this.bot, 'Chest despawned');
                this.removeChestFromQueue(position);
            }
        }
    }
    
    onChat(message) {
        if (!this.enabled) return;
        
        const text = message.toString();
        if (text === 'CHEST LOCKPICKED') {
            this.chestSolved = true;
        }
    }
    
    // Helper methods
    isPositionEqual(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        return pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z;
    }
    
    getChestFacing(chestBlock) {
        // Default facing if property not available
        return chestBlock.getProperties()?.facing || 'north';
    }
    
    getOffsetPosition(pos, facing) {
        const offsets = {
            north: { x: 0, y: 0, z: -1 },
            south: { x: 0, y: 0, z: 1 },
            east: { x: 1, y: 0, z: 0 },
            west: { x: -1, y: 0, z: 0 }
        };
        
        const offset = offsets[facing] || offsets.north;
        return {
            x: pos.x + offset.x,
            y: pos.y + offset.y,
            z: pos.z + offset.z
        };
    }
    
    removeChestFromQueue(position) {
        AutoChestUnlocker.chestQueue = AutoChestUnlocker.chestQueue.filter(
            chest => !this.isPositionEqual(chest, position)
        );
    }
    
    hasTimerEnded() {
        return this.timer.isScheduled() && this.timer.passed();
    }
    
    isTimerRunning() {
        return this.timer.isScheduled() && !this.timer.passed();
    }
    
    // Static methods for chest queue management
    static clearChestQueue() {
        AutoChestUnlocker.chestQueue.length = 0;
    }
    
    static getChestQueueSize() {
        return AutoChestUnlocker.chestQueue.length;
    }
}

// State enumeration
AutoChestUnlocker.State = {
    STARTING: 'STARTING',
    FINDING_WALKABLE_BLOCKS: 'FINDING_WALKABLE_BLOCKS',
    WALKING: 'WALKING',
    WAITING: 'WAITING',
    LOOKING: 'LOOKING',
    VERIFYING_ROTATION: 'VERIFYING_ROTATION',
    CLICKING: 'CLICKING',
    ENDING: 'ENDING'
};

// Failure enumeration
AutoChestUnlocker.ChestFailure = {
    NONE: 'NONE',
    NO_TOOL_IN: 'NO_TOOL_IN'
};

module.exports = AutoChestUnlocker;

