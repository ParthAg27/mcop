const AbstractFeature = require('../feature/AbstractFeature');
const Logger = require('../util/Logger');
const PlayerUtil = require('../util/PlayerUtil');
const BlockUtil = require('../util/BlockUtil');
const InventoryUtil = require('../util/InventoryUtil');
const KeyBindUtil = require('../util/KeyBindUtil');
const RotationHandler = require('../handlers/RotationHandler');
const Pathfinder = require('./Pathfinder');
const Clock = require('../util/helper/Clock');
const { Vec3 } = require('vec3');

/**
 * RouteNavigator - Advanced route navigation and execution
 * Perfect 1:1 replica of Java RouteNavigator
 * 
 * Features:
 * - Multi-method route navigation
 * - AOTV and Etherwarp support
 * - Intelligent waypoint following
 * - Error handling and recovery
 * - Route optimization
 */
class RouteNavigator extends AbstractFeature {
    constructor(bot) {
        super(bot);
        this.name = 'RouteNavigator';
        
        // Singleton pattern
        if (!RouteNavigator._instance) {
            RouteNavigator._instance = this;
        }
        
        // State management
        this.state = 'IDLE';
        this.currentRoute = null;
        this.currentWaypointIndex = 0;
        this.targetWaypoint = null;
        
        // Navigation parameters
        this.stuckTimer = new Clock();
        this.waypointTimer = new Clock();
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Transport method handling
        this.lastTransportAttempt = 0;
        this.transportCooldown = 1000; // 1 second cooldown
        
        this.setupEventListeners();
    }
    
    static getInstance(bot) {
        if (!RouteNavigator._instance && bot) {
            RouteNavigator._instance = new RouteNavigator(bot);
        }
        return RouteNavigator._instance;
    }
    
    /**
     * Start navigating a route
     * @param {Object} route - Route object with waypoints
     */
    startRoute(route) {
        if (!route || !route.waypoints || route.waypoints.length === 0) {
            Logger.error(this.bot, 'Invalid route provided');
            return false;
        }
        
        this.currentRoute = route;
        this.currentWaypointIndex = 0;
        this.state = 'NAVIGATING';
        this.enabled = true;
        this.retryCount = 0;
        
        Logger.info(this.bot, `Starting route navigation with ${route.waypoints.length} waypoints`);
        this.navigateToNextWaypoint();
        
        return true;
    }
    
    stop() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.state = 'IDLE';
        this.currentRoute = null;
        this.currentWaypointIndex = 0;
        this.targetWaypoint = null;
        this.retryCount = 0;
        
        // Stop related systems
        Pathfinder.getInstance(this.bot).stop();
        RotationHandler.getInstance(this.bot).stop();
        KeyBindUtil.releaseAllExcept(this.bot);
        
        Logger.info(this.bot, 'RouteNavigator stopped');
    }
    
    setupEventListeners() {
        // Main navigation tick
        this.bot.on('physicTick', () => {
            if (!this.enabled) return;
            this.onTick();
        });
        
        // Monitor for successful teleports/movements
        this.bot.on('move', () => {
            if (!this.enabled || this.state !== 'TRANSPORTING') return;
            this.checkWaypointReached();
        });
    }
    
    onTick() {
        if (!this.currentRoute) {
            this.stop();
            return;
        }
        
        // Check stuck timer
        if (this.stuckTimer.isScheduled() && this.stuckTimer.passed()) {
            Logger.warn(this.bot, 'Navigation stuck, retrying');
            this.handleStuck();
            return;
        }
        
        switch (this.state) {
            case 'NAVIGATING':
                this.handleNavigating();
                break;
            case 'TRANSPORTING':
                this.handleTransporting();
                break;
            case 'WALKING':
                this.handleWalking();
                break;
            case 'COMPLETED':
                this.handleCompleted();
                break;
        }
    }
    
    handleNavigating() {
        if (!this.targetWaypoint) {
            this.navigateToNextWaypoint();
            return;
        }
        
        const currentPos = this.bot.entity.position;
        const distance = currentPos.distanceTo(this.targetWaypoint.position);
        
        // Check if we've reached the waypoint
        if (distance < 3) {
            Logger.info(this.bot, `Reached waypoint ${this.currentWaypointIndex}`);
            this.currentWaypointIndex++;
            this.navigateToNextWaypoint();
            return;
        }
        
        // Determine navigation method
        const transportMethod = this.targetWaypoint.transportMethod || 'WALK';
        
        switch (transportMethod) {
            case 'AOTV':
            case 'ETHERWARP':
                this.startTransport(transportMethod);
                break;
            case 'WALK':
            default:
                this.startWalking();
                break;
        }
    }
    
    handleTransporting() {
        // Check if transport completed
        if (this.waypointTimer.passed()) {
            Logger.warn(this.bot, 'Transport timeout, falling back to walking');
            this.startWalking();
            return;
        }
        
        this.checkWaypointReached();
    }
    
    handleWalking() {
        const pathfinder = Pathfinder.getInstance(this.bot);
        
        if (!pathfinder.isRunning()) {
            if (pathfinder.succeeded()) {
                Logger.info(this.bot, 'Walking completed successfully');
                this.checkWaypointReached();
            } else {
                Logger.error(this.bot, 'Walking failed, retrying');
                this.retryNavigation();
            }
        }
    }
    
    handleCompleted() {
        Logger.info(this.bot, 'Route navigation completed');
        this.stop();
    }
    
    navigateToNextWaypoint() {
        if (this.currentWaypointIndex >= this.currentRoute.waypoints.length) {
            this.state = 'COMPLETED';
            return;
        }
        
        this.targetWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex];
        this.state = 'NAVIGATING';
        this.retryCount = 0;
        
        Logger.info(this.bot, `Navigating to waypoint ${this.currentWaypointIndex}: ${this.targetWaypoint.position.x}, ${this.targetWaypoint.position.y}, ${this.targetWaypoint.position.z}`);
    }
    
    startTransport(method) {
        const now = Date.now();
        if (now - this.lastTransportAttempt < this.transportCooldown) {
            return; // Still on cooldown
        }
        
        this.lastTransportAttempt = now;
        this.state = 'TRANSPORTING';
        this.waypointTimer.schedule(5000); // 5 second timeout
        
        Logger.info(this.bot, `Attempting ${method} transport`);
        
        switch (method) {
            case 'AOTV':
                this.performAOTVTransport();
                break;
            case 'ETHERWARP':
                this.performEtherwarpTransport();
                break;
        }
        
        // Start stuck detection
        this.stuckTimer.schedule(10000);
    }
    
    performAOTVTransport() {
        // Hold AOTV item
        if (!InventoryUtil.holdItem(this.bot, 'Aspect of the Void')) {
            Logger.error(this.bot, 'AOTV not found, falling back to walking');
            this.startWalking();
            return;
        }
        
        // Look at target position
        const rotationHandler = RotationHandler.getInstance(this.bot);
        rotationHandler.easeTo({
            target: { position: this.targetWaypoint.position },
            duration: 300,
            callback: () => {
                // Right click to teleport
                KeyBindUtil.rightClick(this.bot);
            }
        });
    }
    
    performEtherwarpTransport() {
        // Hold Etherwarp item
        if (!InventoryUtil.holdItem(this.bot, 'Etherwarp Conduit')) {
            Logger.error(this.bot, 'Etherwarp Conduit not found, falling back to walking');
            this.startWalking();
            return;
        }
        
        // Look at target position
        const rotationHandler = RotationHandler.getInstance(this.bot);
        rotationHandler.easeTo({
            target: { position: this.targetWaypoint.position },
            duration: 300,
            callback: () => {
                // Right click to teleport
                KeyBindUtil.rightClick(this.bot);
            }
        });
    }
    
    startWalking() {
        this.state = 'WALKING';
        
        const pathfinder = Pathfinder.getInstance(this.bot);
        const currentPos = PlayerUtil.getBlockStandingOn(this.bot);
        const targetPos = this.targetWaypoint.position;
        
        pathfinder.queue(currentPos, targetPos);
        pathfinder.start();
        
        Logger.info(this.bot, 'Started walking to waypoint');
        
        // Start stuck detection
        this.stuckTimer.schedule(30000); // 30 second timeout for walking
    }
    
    checkWaypointReached() {
        if (!this.targetWaypoint) return;
        
        const currentPos = this.bot.entity.position;
        const distance = currentPos.distanceTo(this.targetWaypoint.position);
        
        if (distance < 5) {
            Logger.info(this.bot, `Successfully reached waypoint ${this.currentWaypointIndex}`);
            this.stuckTimer.reset();
            this.waypointTimer.reset();
            this.currentWaypointIndex++;
            this.navigateToNextWaypoint();
        }
    }
    
    handleStuck() {
        this.stuckTimer.reset();
        this.retryNavigation();
    }
    
    retryNavigation() {
        this.retryCount++;
        
        if (this.retryCount >= this.maxRetries) {
            Logger.error(this.bot, `Max retries (${this.maxRetries}) reached, skipping waypoint`);
            this.currentWaypointIndex++;
            this.retryCount = 0;
            this.navigateToNextWaypoint();
            return;
        }
        
        Logger.warn(this.bot, `Retrying navigation (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // Stop current actions
        Pathfinder.getInstance(this.bot).stop();
        RotationHandler.getInstance(this.bot).stop();
        
        // Try walking as fallback
        this.startWalking();
    }
    
    // Getters
    getCurrentWaypointIndex() {
        return this.currentWaypointIndex;
    }
    
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    getState() {
        return this.state;
    }
    
    isNavigating() {
        return this.enabled && this.state !== 'IDLE';
    }
    
    getProgress() {
        if (!this.currentRoute) return 0;
        return (this.currentWaypointIndex / this.currentRoute.waypoints.length) * 100;
    }
    
    // Route management
    pauseNavigation() {
        if (this.enabled) {
            this.enabled = false;
            Pathfinder.getInstance(this.bot).stop();
            Logger.info(this.bot, 'Navigation paused');
        }
    }
    
    resumeNavigation() {
        if (!this.enabled && this.currentRoute) {
            this.enabled = true;
            Logger.info(this.bot, 'Navigation resumed');
        }
    }
    
    skipWaypoint() {
        if (this.currentRoute && this.currentWaypointIndex < this.currentRoute.waypoints.length) {
            Logger.info(this.bot, `Skipping waypoint ${this.currentWaypointIndex}`);
            this.currentWaypointIndex++;
            this.navigateToNextWaypoint();
        }
    }
}

// State enumeration
RouteNavigator.State = {
    IDLE: 'IDLE',
    NAVIGATING: 'NAVIGATING',
    TRANSPORTING: 'TRANSPORTING',
    WALKING: 'WALKING',
    COMPLETED: 'COMPLETED'
};

module.exports = RouteNavigator;

