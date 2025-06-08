/**
 * GlacialMacro - Advanced glacial mining automation
 * Perfect 1:1 replica of Java GlacialMacro.java
 */

const AbstractMacro = require('../macro/AbstractMacro');
const BlockMiner = require('../feature/impl/BlockMiner/BlockMiner');
const AutoWarp = require('../features/AutoWarp');
const GameStateHandler = require('../handlers/GameStateHandler');
const GraphHandler = require('../handlers/GraphHandler');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const Logger = require('../util/Logger');
const Clock = require('../util/Clock');
const { Vec3 } = require('vec3');

// State enums
const MainState = {
    NONE: 'NONE',
    TELEPORTING: 'TELEPORTING',
    INITIALIZATION: 'INITIALIZATION',
    MACRO: 'MACRO'
};

const State = {
    PATHFINDING: 'PATHFINDING',
    MINING: 'MINING',
    SWITCHING: 'SWITCHING'
};

const InitializeState = {
    STARTING: 'STARTING',
    SCANNING: 'SCANNING',
    COMPLETED: 'COMPLETED'
};

const TeleportState = {
    STARTING: 'STARTING',
    TRIGGERING_AUTOWARP: 'TRIGGERING_AUTOWARP',
    WAITING: 'WAITING'
};

// Glacite vein types
const GlaciteVeins = {
    GLACITE: { name: 'Glacite', priority: 1, blocks: ['glacite_ore', 'glacite'] },
    HARD_STONE: { name: 'Hard Stone', priority: 2, blocks: ['stone', 'hard_stone'] },
    COAL: { name: 'Coal', priority: 3, blocks: ['coal_ore', 'coal'] },
    IRON: { name: 'Iron', priority: 4, blocks: ['iron_ore', 'iron'] },
    GOLD: { name: 'Gold', priority: 5, blocks: ['gold_ore', 'gold'] }
};

class GlacialMacro extends AbstractMacro {
    static instance = null;
    
    constructor() {
        super();
        
        this.miner = BlockMiner.getInstance();
        this.gameStateHandler = GameStateHandler.getInstance();
        this.graphHandler = GraphHandler.getInstance();
        
        // State management
        this.mainState = MainState.TELEPORTING;
        this.state = State.PATHFINDING;
        this.initializeState = InitializeState.STARTING;
        this.teleportState = TeleportState.STARTING;
        
        // Configuration
        this.macroRetries = 0;
        this.warpRetries = 0;
        this.miningSpeed = 200;
        
        // Mining data
        this.typeToMine = [];
        this.currentVein = null;
        this.previousVeins = new Map();
        
        // Timing
        this.stateTimer = new Clock();
        this.miningTimer = new Clock();
        this.switchTimer = new Clock();
    }
    
    static getInstance() {
        if (!GlacialMacro.instance) {
            GlacialMacro.instance = new GlacialMacro();
        }
        return GlacialMacro.instance;
    }
    
    getName() {
        return "Glacial Macro";
    }
    
    onEnable() {
        try {
            Logger.info("[GlacialMacro] Starting glacial mining automation...");
            
            // Configure miner
            this.miner.setWaitThreshold(500);
            
            // Reset state
            this.mainState = MainState.TELEPORTING;
            this.state = State.PATHFINDING;
            this.initializeState = InitializeState.STARTING;
            this.teleportState = TeleportState.STARTING;
            
            // Clear mining data
            this.typeToMine = [];
            this.currentVein = null;
            this.previousVeins.clear();
            
            // Reset counters
            this.macroRetries = 0;
            this.warpRetries = 0;
            
            super.onEnable();
        } catch (error) {
            Logger.error(`[GlacialMacro] Error in onEnable: ${error.message}`);
            this.disable();
        }
    }
    
    onDisable() {
        try {
            Logger.info("[GlacialMacro] Stopping glacial mining...");
            
            // Stop miner
            this.miner.disable();
            
            // Reset timers
            this.stateTimer.reset();
            this.miningTimer.reset();
            this.switchTimer.reset();
            
            super.onDisable();
        } catch (error) {
            Logger.error(`[GlacialMacro] Error in onDisable: ${error.message}`);
        }
    }
    
    onTick(bot) {
        if (!this.enabled || !bot) return;
        
        try {
            // Check if timers are running
            if (this.isTimerRunning()) {
                return;
            }
            
            switch (this.mainState) {
                case MainState.NONE:
                    return;
                case MainState.TELEPORTING:
                    this.onTeleportState(bot);
                    return;
                case MainState.INITIALIZATION:
                    this.onInitializeState(bot);
                    return;
                case MainState.MACRO:
                    this.onMacroState(bot);
                    return;
            }
        } catch (error) {
            Logger.error(`[GlacialMacro] Error in onTick: ${error.message}`);
            this.disable();
        }
    }
    
    /**
     * Handle teleport state
     */
    onTeleportState(bot) {
        const currentLocation = this.gameStateHandler.getCurrentSubLocation();
        
        // Check if already in glacial tunnels
        if (currentLocation === "Dwarven Base Camp" || currentLocation === "Glacite Tunnels") {
            Logger.info("[GlacialMacro] Already in glacial area, proceeding to initialization");
            this.mainState = MainState.INITIALIZATION;
            return;
        }
        
        switch (this.teleportState) {
            case TeleportState.STARTING:
                Logger.info("[GlacialMacro] Starting teleport to glacial tunnels");
                this.teleportState = TeleportState.TRIGGERING_AUTOWARP;
                break;
                
            case TeleportState.TRIGGERING_AUTOWARP:
                if (this.triggerAutoWarp(bot)) {
                    this.teleportState = TeleportState.WAITING;
                    this.stateTimer.schedule(5000); // 5 second timeout
                }
                break;
                
            case TeleportState.WAITING:
                if (this.stateTimer.passed()) {
                    this.warpRetries++;
                    if (this.warpRetries >= 3) {
                        Logger.error("[GlacialMacro] Failed to warp after 3 attempts");
                        this.disable();
                        return;
                    }
                    this.teleportState = TeleportState.STARTING;
                }
                break;
        }
    }
    
    /**
     * Handle initialization state
     */
    onInitializeState(bot) {
        switch (this.initializeState) {
            case InitializeState.STARTING:
                Logger.info("[GlacialMacro] Initializing glacial mining");
                this.initializeState = InitializeState.SCANNING;
                break;
                
            case InitializeState.SCANNING:
                if (this.scanForVeins(bot)) {
                    this.initializeState = InitializeState.COMPLETED;
                }
                break;
                
            case InitializeState.COMPLETED:
                if (this.typeToMine.length > 0) {
                    Logger.info(`[GlacialMacro] Found ${this.typeToMine.length} veins to mine`);
                    this.mainState = MainState.MACRO;
                    this.state = State.PATHFINDING;
                } else {
                    Logger.warn("[GlacialMacro] No veins found, retrying...");
                    this.initializeState = InitializeState.STARTING;
                    this.stateTimer.schedule(2000);
                }
                break;
        }
    }
    
    /**
     * Handle main macro state
     */
    onMacroState(bot) {
        switch (this.state) {
            case State.PATHFINDING:
                this.handlePathfinding(bot);
                break;
            case State.MINING:
                this.handleMining(bot);
                break;
            case State.SWITCHING:
                this.handleSwitching(bot);
                break;
        }
    }
    
    /**
     * Handle pathfinding to vein
     */
    handlePathfinding(bot) {
        if (!this.currentVein) {
            this.selectNextVein();
            if (!this.currentVein) {
                Logger.warn("[GlacialMacro] No veins available, rescanning...");
                this.mainState = MainState.INITIALIZATION;
                this.initializeState = InitializeState.STARTING;
                return;
            }
        }
        
        const veinPosition = this.currentVein.position;
        const playerPos = bot.entity.position;
        const distance = playerPos.distanceTo(veinPosition);
        
        if (distance < 5) {
            Logger.info(`[GlacialMacro] Reached vein: ${this.currentVein.type.name}`);
            this.state = State.MINING;
            this.miningTimer.schedule(30000); // 30 second mining timeout
        } else {
            // Use pathfinder to move to vein
            this.moveToPosition(bot, veinPosition);
        }
    }
    
    /**
     * Handle mining state
     */
    handleMining(bot) {
        if (!this.miner.enabled) {
            this.miner.enable();
            Logger.info(`[GlacialMacro] Started mining ${this.currentVein.type.name}`);
        }
        
        // Run mining logic
        this.miner.onTick(bot);
        
        // Check mining timeout or completion
        if (this.miningTimer.passed() || this.isVeinDepleted(bot)) {
            this.miner.disable();
            this.markVeinAsMined();
            this.state = State.SWITCHING;
            Logger.info(`[GlacialMacro] Finished mining ${this.currentVein.type.name}`);
        }
    }
    
    /**
     * Handle switching to next vein
     */
    handleSwitching(bot) {
        this.currentVein = null;
        this.state = State.PATHFINDING;
        Logger.info("[GlacialMacro] Switching to next vein");
    }
    
    /**
     * Trigger auto warp to glacial tunnels
     */
    triggerAutoWarp(bot) {
        try {
            // Use AutoWarp feature
            const autoWarp = AutoWarp.getInstance();
            if (autoWarp) {
                autoWarp.warpTo("Dwarven Base Camp");
                return true;
            }
            
            // Fallback: use chat command
            bot.chat("/warp glacial");
            return true;
        } catch (error) {
            Logger.error(`[GlacialMacro] Error triggering autowarp: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Scan for glacite veins in the area
     */
    scanForVeins(bot) {
        try {
            this.typeToMine = [];
            const playerPos = bot.entity.position;
            const scanRadius = 50;
            
            // Scan for blocks in the area
            for (let x = -scanRadius; x <= scanRadius; x++) {
                for (let y = -scanRadius; y <= scanRadius; y++) {
                    for (let z = -scanRadius; z <= scanRadius; z++) {
                        const blockPos = playerPos.offset(x, y, z);
                        const block = bot.blockAt(blockPos);
                        
                        if (block && this.isGlaciteVein(block)) {
                            const veinType = this.getVeinType(block);
                            if (veinType) {
                                this.typeToMine.push({
                                    type: veinType,
                                    position: blockPos,
                                    discoveredAt: Date.now()
                                });
                            }
                        }
                    }
                }
            }
            
            // Sort by priority
            this.typeToMine.sort((a, b) => a.type.priority - b.type.priority);
            
            return true;
        } catch (error) {
            Logger.error(`[GlacialMacro] Error scanning for veins: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Select next vein to mine
     */
    selectNextVein() {
        const now = Date.now();
        
        // Filter out recently mined veins
        const availableVeins = this.typeToMine.filter(vein => {
            const lastMined = this.previousVeins.get(vein);
            return !lastMined || (now - lastMined) > 60000; // 1 minute cooldown
        });
        
        if (availableVeins.length > 0) {
            this.currentVein = availableVeins[0];
            Logger.info(`[GlacialMacro] Selected vein: ${this.currentVein.type.name}`);
        } else {
            this.currentVein = null;
        }
    }
    
    /**
     * Mark current vein as mined
     */
    markVeinAsMined() {
        if (this.currentVein) {
            this.previousVeins.set(this.currentVein, Date.now());
        }
    }
    
    /**
     * Check if block is a glacite vein
     */
    isGlaciteVein(block) {
        if (!block || !block.name) return false;
        
        const blockName = block.name.toLowerCase();
        return Object.values(GlaciteVeins).some(vein => 
            vein.blocks.some(blockType => blockName.includes(blockType))
        );
    }
    
    /**
     * Get vein type from block
     */
    getVeinType(block) {
        if (!block || !block.name) return null;
        
        const blockName = block.name.toLowerCase();
        return Object.values(GlaciteVeins).find(vein => 
            vein.blocks.some(blockType => blockName.includes(blockType))
        );
    }
    
    /**
     * Check if vein is depleted
     */
    isVeinDepleted(bot) {
        if (!this.currentVein) return true;
        
        const block = bot.blockAt(this.currentVein.position);
        return !block || !this.isGlaciteVein(block);
    }
    
    /**
     * Move to position
     */
    moveToPosition(bot, position) {
        try {
            // Simple movement towards position
            const playerPos = bot.entity.position;
            const direction = position.minus(playerPos).normalize();
            
            // Set movement controls
            bot.setControlState('forward', true);
            
            // Look towards target
            const yaw = Math.atan2(-direction.x, -direction.z);
            const pitch = Math.asin(-direction.y);
            bot.look(yaw, pitch, true);
        } catch (error) {
            Logger.error(`[GlacialMacro] Error moving to position: ${error.message}`);
        }
    }
    
    /**
     * Check if any timer is running
     */
    isTimerRunning() {
        return (this.stateTimer.isScheduled() && !this.stateTimer.passed()) ||
               (this.miningTimer.isScheduled() && !this.miningTimer.passed()) ||
               (this.switchTimer.isScheduled() && !this.switchTimer.passed());
    }
    
    /**
     * Get current state information
     */
    getStateInfo() {
        return {
            mainState: this.mainState,
            state: this.state,
            initializeState: this.initializeState,
            teleportState: this.teleportState,
            currentVein: this.currentVein?.type?.name || 'None',
            availableVeins: this.typeToMine.length,
            retries: this.macroRetries
        };
    }
}

// Export enums as well
GlacialMacro.MainState = MainState;
GlacialMacro.State = State;
GlacialMacro.InitializeState = InitializeState;
GlacialMacro.TeleportState = TeleportState;
GlacialMacro.GlaciteVeins = GlaciteVeins;

module.exports = GlacialMacro;

