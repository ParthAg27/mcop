/**
 * RouteMinerMacro - Advanced route-based mining automation
 * Perfect 1:1 replica of Java RouteMinerMacro.java
 */

const AbstractMacro = require('../macro/AbstractMacro');
const BlockMiner = require('../feature/impl/BlockMiner/BlockMiner');
const Pathfinder = require('../features/Pathfinder');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const Logger = require('../util/Logger');
const { Vec3 } = require('vec3');

class RouteMinerMacro extends AbstractMacro {
    static instance = null;
    
    constructor() {
        super();
        
        this.miner = BlockMiner.getInstance();
        this.pathfinder = Pathfinder.getInstance();
        
        // State management
        this.currentState = "STARTING";
        this.route = [];
        this.currentRouteIndex = 0;
        this.miningRetries = 0;
        this.maxRetries = 3;
        
        // Mining configuration
        this.miningRadius = 5;
        this.miningSpeed = 200;
        this.waitThreshold = 500;
    }
    
    static getInstance() {
        if (!RouteMinerMacro.instance) {
            RouteMinerMacro.instance = new RouteMinerMacro();
        }
        return RouteMinerMacro.instance;
    }
    
    getName() {
        return "Route Miner Macro";
    }
    
    getNecessaryItems() {
        const items = [];
        
        if (MightyMinerConfig.drillRefuel) {
            items.push("Abiphone");
        }
        
        // Add mining tools
        items.push("Mining Drill", "Pickaxe", "Drill");
        
        return items;
    }
    
    /**
     * Set the mining route
     * @param {Array<Vec3>} route - Array of positions to mine at
     */
    setRoute(route) {
        this.route = route || [];
        this.currentRouteIndex = 0;
        Logger.info(`[RouteMinerMacro] Route set with ${this.route.length} waypoints`);
    }
    
    /**
     * Add waypoint to route
     * @param {Vec3} position - Position to add
     */
    addWaypoint(position) {
        this.route.push(position);
        Logger.info(`[RouteMinerMacro] Added waypoint: ${position}`);
    }
    
    /**
     * Clear the current route
     */
    clearRoute() {
        this.route = [];
        this.currentRouteIndex = 0;
        Logger.info("[RouteMinerMacro] Route cleared");
    }
    
    onEnable() {
        try {
            Logger.info("[RouteMinerMacro] Starting route mining...");
            
            this.currentState = "STARTING";
            this.currentRouteIndex = 0;
            this.miningRetries = 0;
            
            // Configure mining settings
            this.miner.setWaitThreshold(this.waitThreshold);
            
            super.onEnable();
        } catch (error) {
            Logger.error(`[RouteMinerMacro] Error in onEnable: ${error.message}`);
            this.disable();
        }
    }
    
    onDisable() {
        try {
            Logger.info("[RouteMinerMacro] Stopping route mining...");
            
            // Stop mining and pathfinding
            this.miner.disable();
            this.pathfinder.stop();
            
            this.currentState = "DISABLED";
            
            super.onDisable();
        } catch (error) {
            Logger.error(`[RouteMinerMacro] Error in onDisable: ${error.message}`);
        }
    }
    
    onTick(bot) {
        if (!this.enabled || !bot) return;
        
        try {
            switch (this.currentState) {
                case "STARTING":
                    this.handleStarting(bot);
                    break;
                case "PATHFINDING":
                    this.handlePathfinding(bot);
                    break;
                case "MINING":
                    this.handleMining(bot);
                    break;
                case "NEXT_WAYPOINT":
                    this.handleNextWaypoint(bot);
                    break;
                case "COMPLETED":
                    this.handleCompleted(bot);
                    break;
                default:
                    Logger.warn(`[RouteMinerMacro] Unknown state: ${this.currentState}`);
                    this.currentState = "STARTING";
            }
        } catch (error) {
            Logger.error(`[RouteMinerMacro] Error in onTick: ${error.message}`);
            this.disable();
        }
    }
    
    /**
     * Handle starting state
     * @param {Object} bot - Mineflayer bot instance
     */
    handleStarting(bot) {
        if (this.route.length === 0) {
            Logger.warn("[RouteMinerMacro] No route set, cannot start mining");
            this.disable();
            return;
        }
        
        Logger.info(`[RouteMinerMacro] Starting route with ${this.route.length} waypoints`);
        this.currentState = "PATHFINDING";
    }
    
    /**
     * Handle pathfinding state
     * @param {Object} bot - Mineflayer bot instance
     */
    async handlePathfinding(bot) {
        if (this.currentRouteIndex >= this.route.length) {
            this.currentState = "COMPLETED";
            return;
        }
        
        const targetWaypoint = this.route[this.currentRouteIndex];
        const currentPos = bot.entity.position;
        const distance = currentPos.distanceTo(targetWaypoint);
        
        // Check if we're close enough to the waypoint
        if (distance < 3) {
            Logger.info(`[RouteMinerMacro] Reached waypoint ${this.currentRouteIndex + 1}/${this.route.length}`);
            this.currentState = "MINING";
            return;
        }
        
        // Start pathfinding if not already pathfinding
        if (!this.pathfinder.isPathfinding()) {
            Logger.info(`[RouteMinerMacro] Pathfinding to waypoint ${this.currentRouteIndex + 1}/${this.route.length}`);
            try {
                await this.pathfinder.goTo(targetWaypoint, bot);
            } catch (error) {
                Logger.error(`[RouteMinerMacro] Pathfinding failed: ${error.message}`);
                this.miningRetries++;
                if (this.miningRetries >= this.maxRetries) {
                    Logger.error("[RouteMinerMacro] Max retries reached, moving to next waypoint");
                    this.currentState = "NEXT_WAYPOINT";
                }
            }
        }
    }
    
    /**
     * Handle mining state
     * @param {Object} bot - Mineflayer bot instance
     */
    handleMining(bot) {
        if (!this.miner.enabled) {
            // Start mining
            this.miner.enable();
            Logger.info(`[RouteMinerMacro] Started mining at waypoint ${this.currentRouteIndex + 1}`);
        }
        
        // Check if mining should continue
        const currentPos = bot.entity.position;
        const targetWaypoint = this.route[this.currentRouteIndex];
        const distance = currentPos.distanceTo(targetWaypoint);
        
        // If we've moved too far from the waypoint, move to next
        if (distance > this.miningRadius * 2) {
            Logger.info(`[RouteMinerMacro] Moved too far from waypoint, proceeding to next`);
            this.currentState = "NEXT_WAYPOINT";
            return;
        }
        
        // Run the mining logic
        this.miner.onTick(bot);
        
        // Check if we should move to next waypoint (based on time or conditions)
        // For now, we'll mine for a certain period then move on
        if (this.getMiningTime() > 30000) { // 30 seconds
            Logger.info(`[RouteMinerMacro] Mining time limit reached, moving to next waypoint`);
            this.currentState = "NEXT_WAYPOINT";
        }
    }
    
    /**
     * Handle next waypoint transition
     * @param {Object} bot - Mineflayer bot instance
     */
    handleNextWaypoint(bot) {
        // Stop mining
        this.miner.disable();
        
        // Move to next waypoint
        this.currentRouteIndex++;
        this.miningRetries = 0;
        this.miningStartTime = null;
        
        if (this.currentRouteIndex >= this.route.length) {
            this.currentState = "COMPLETED";
        } else {
            this.currentState = "PATHFINDING";
        }
        
        Logger.info(`[RouteMinerMacro] Moving to waypoint ${this.currentRouteIndex + 1}/${this.route.length}`);
    }
    
    /**
     * Handle completion state
     * @param {Object} bot - Mineflayer bot instance
     */
    handleCompleted(bot) {
        Logger.info("[RouteMinerMacro] Route completed, restarting...");
        
        // Restart the route
        this.currentRouteIndex = 0;
        this.currentState = "STARTING";
        
        // Or disable if configured to run once
        if (MightyMinerConfig.runOnce) {
            this.disable();
        }
    }
    
    /**
     * Get current mining time
     * @returns {number} - Mining time in milliseconds
     */
    getMiningTime() {
        if (!this.miningStartTime) {
            this.miningStartTime = Date.now();
            return 0;
        }
        return Date.now() - this.miningStartTime;
    }
    
    /**
     * Get current state
     * @returns {string} - Current state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Get current route progress
     * @returns {Object} - Progress information
     */
    getProgress() {
        return {
            currentWaypoint: this.currentRouteIndex,
            totalWaypoints: this.route.length,
            percentage: this.route.length > 0 ? (this.currentRouteIndex / this.route.length) * 100 : 0,
            state: this.currentState
        };
    }
}

module.exports = RouteMinerMacro;

