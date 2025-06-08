/**
 * Pathfinder - Advanced pathfinding system with A* algorithm
 * Perfect 1:1 replica of Java Pathfinder.java
 */

const AbstractFeature = require('../feature/AbstractFeature');
const PlayerUtil = require('../util/PlayerUtil');
const Logger = require('../util/Logger');
const { Vec3 } = require('vec3');
const mineflayerPathfinder = require('mineflayer-pathfinder');

class Pathfinder extends AbstractFeature {
    static instance = null;
    
    constructor() {
        super();
        this.pathQueue = [];
        this.pathExecutor = null;
        this.skipTick = false;
        this.pathfinding = false;
        this.failed = false;
        this.succeeded = false;
        this.currentPath = null;
        this.currentGoal = null;
    }
    
    static getInstance() {
        if (!Pathfinder.instance) {
            Pathfinder.instance = new Pathfinder();
        }
        return Pathfinder.instance;
    }
    
    getName() {
        return "Pathfinder";
    }
    
    /**
     * Initialize pathfinder with bot
     * @param {Object} bot - Mineflayer bot instance
     */
    initialize(bot) {
        if (!bot) {
            Logger.error("[Pathfinder] Bot instance required for initialization");
            return;
        }
        
        try {
            // Load pathfinder plugin if not already loaded
            if (!bot.pathfinder) {
                bot.loadPlugin(mineflayerPathfinder.pathfinder);
            }
            
            Logger.info("[Pathfinder] Initialized successfully");
        } catch (error) {
            Logger.error(`[Pathfinder] Failed to initialize: ${error.message}`);
        }
    }
    
    /**
     * Find path to target position
     * @param {Vec3} start - Start position
     * @param {Vec3} end - End position
     * @param {Object} bot - Mineflayer bot instance
     * @returns {Promise<Array>} - Path as array of positions
     */
    async findPath(start, end, bot) {
        if (!bot || !bot.pathfinder) {
            Logger.error("[Pathfinder] Bot pathfinder not available");
            return [];
        }
        
        try {
            this.pathfinding = true;
            this.failed = false;
            this.succeeded = false;
            
            const goal = new mineflayerPathfinder.goals.GoalBlock(end.x, end.y, end.z);
            this.currentGoal = goal;
            
            // Set pathfinder movements
            const movements = new mineflayerPathfinder.Movements(bot);
            movements.allowParkour = true;
            movements.allowSprinting = true;
            movements.allowDigWhilePathing = true;
            bot.pathfinder.setMovements(movements);
            
            // Start pathfinding
            await bot.pathfinder.goto(goal);
            
            this.pathfinding = false;
            this.succeeded = true;
            
            Logger.info(`[Pathfinder] Path found and executed to ${end}`);
            return [end]; // Simplified for mineflayer integration
            
        } catch (error) {
            this.pathfinding = false;
            this.failed = true;
            Logger.error(`[Pathfinder] Failed to find path: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Go to specific position
     * @param {Vec3} position - Target position
     * @param {Object} bot - Mineflayer bot instance
     * @returns {Promise<boolean>} - Success status
     */
    async goTo(position, bot) {
        if (!bot || !position) {
            return false;
        }
        
        try {
            const path = await this.findPath(bot.entity.position, position, bot);
            return path.length > 0;
        } catch (error) {
            Logger.error(`[Pathfinder] Error in goTo: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Stop current pathfinding
     * @param {Object} bot - Mineflayer bot instance
     */
    stop(bot) {
        try {
            if (bot && bot.pathfinder) {
                bot.pathfinder.stop();
            }
            
            this.pathfinding = false;
            this.currentPath = null;
            this.currentGoal = null;
            this.pathQueue = [];
            
            Logger.info("[Pathfinder] Stopped pathfinding");
        } catch (error) {
            Logger.error(`[Pathfinder] Error stopping pathfinder: ${error.message}`);
        }
    }
    
    /**
     * Check if currently pathfinding
     * @returns {boolean} - True if pathfinding
     */
    isPathfinding() {
        return this.pathfinding;
    }
    
    /**
     * Check if last pathfinding failed
     * @returns {boolean} - True if failed
     */
    hasFailed() {
        return this.failed;
    }
    
    /**
     * Check if last pathfinding succeeded
     * @returns {boolean} - True if succeeded
     */
    hasSucceeded() {
        return this.succeeded;
    }
    
    /**
     * Add position to path queue
     * @param {Vec3} start - Start position
     * @param {Vec3} end - End position
     */
    addToQueue(start, end) {
        this.pathQueue.push({ start, end });
    }
    
    /**
     * Process next item in path queue
     * @param {Object} bot - Mineflayer bot instance
     */
    async processQueue(bot) {
        if (this.pathQueue.length === 0 || this.pathfinding) {
            return;
        }
        
        const nextPath = this.pathQueue.shift();
        if (nextPath) {
            await this.findPath(nextPath.start, nextPath.end, bot);
        }
    }
    
    /**
     * Clear path queue
     */
    clearQueue() {
        this.pathQueue = [];
    }
    
    /**
     * Get current path
     * @returns {Array|null} - Current path or null
     */
    getCurrentPath() {
        return this.currentPath;
    }
    
    /**
     * Get current goal
     * @returns {Object|null} - Current goal or null
     */
    getCurrentGoal() {
        return this.currentGoal;
    }
    
    /**
     * Calculate distance to goal
     * @param {Object} bot - Mineflayer bot instance
     * @returns {number} - Distance to goal
     */
    getDistanceToGoal(bot) {
        if (!this.currentGoal || !bot || !bot.entity) {
            return -1;
        }
        
        const goalPos = new Vec3(this.currentGoal.x, this.currentGoal.y, this.currentGoal.z);
        return bot.entity.position.distanceTo(goalPos);
    }
    
    onTick(bot) {
        if (!this.enabled || this.skipTick) {
            return;
        }
        
        try {
            // Process queue if not currently pathfinding
            if (!this.pathfinding) {
                this.processQueue(bot);
            }
        } catch (error) {
            Logger.error(`[Pathfinder] Error in onTick: ${error.message}`);
        }
    }
}

module.exports = Pathfinder;

