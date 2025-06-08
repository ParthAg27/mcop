const AbstractFeature = require('../feature/AbstractFeature');
const Logger = require('../util/Logger');
const PlayerUtil = require('../util/PlayerUtil');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const RouteWaypoint = require('../util/helper/route/RouteWaypoint');

/**
 * RouteBuilder - Interactive route building system
 * Perfect 1:1 replica of Java RouteBuilder
 * 
 * Features:
 * - Real-time route building
 * - Multiple transport methods (AOTV, Etherwarp)
 * - Route modification and deletion
 * - Automatic data persistence
 * - Keybind integration
 */
class RouteBuilder extends AbstractFeature {
    constructor(bot) {
        super(bot);
        this.name = 'RouteBuilder';
        
        // Singleton pattern
        if (!RouteBuilder._instance) {
            RouteBuilder._instance = this;
        }
        
        this.setupEventListeners();
    }
    
    static getInstance(bot) {
        if (!RouteBuilder._instance && bot) {
            RouteBuilder._instance = new RouteBuilder(bot);
        }
        return RouteBuilder._instance;
    }
    
    toggle() {
        if (!this.enabled) {
            this.start();
        } else {
            this.stop();
        }
    }
    
    start() {
        this.enabled = true;
        
        // Schedule route data saving (simulate multithreading)
        setTimeout(() => {
            const routeHandler = require('../handlers/RouteHandler');
            if (routeHandler.getInstance) {
                routeHandler.getInstance(this.bot).saveData();
            }
        }, 0);
        
        Logger.info(this.bot, 'Enabling RouteBuilder');
    }
    
    stop() {
        this.enabled = false;
        Logger.info(this.bot, 'Disabling RouteBuilder');
    }
    
    setupEventListeners() {
        // In mineflayer, we don't have direct keyboard events
        // Instead, we can use chat commands or other input methods
        
        this.bot.on('message', (message) => {
            if (!this.enabled) return;
            
            const text = message.toString().toLowerCase();
            
            // Handle route building commands
            if (text.includes('!route add aotv')) {
                this.addToRoute('AOTV');
                Logger.info(this.bot, 'Added AOTV waypoint');
            } else if (text.includes('!route add etherwarp')) {
                this.addToRoute('ETHERWARP');
                Logger.info(this.bot, 'Added Etherwarp waypoint');
            } else if (text.includes('!route remove')) {
                this.removeFromRoute();
                Logger.info(this.bot, 'Removed waypoint from route');
            }
        });
        
        // Alternative: Use whisper commands for route building
        this.bot.on('whisper', (username, message) => {
            if (!this.enabled) return;
            
            const text = message.toLowerCase();
            
            if (text === 'add aotv') {
                this.addToRoute('AOTV');
                this.bot.whisper(username, 'Added AOTV waypoint to route');
            } else if (text === 'add etherwarp') {
                this.addToRoute('ETHERWARP');
                this.bot.whisper(username, 'Added Etherwarp waypoint to route');
            } else if (text === 'remove') {
                this.removeFromRoute();
                this.bot.whisper(username, 'Removed waypoint from route');
            } else if (text.startsWith('replace ')) {
                const index = parseInt(text.split(' ')[1]);
                if (!isNaN(index)) {
                    this.replaceNode(index);
                    this.bot.whisper(username, `Replaced node ${index} with current position`);
                }
            }
        });
    }
    
    /**
     * Handle key events for route building
     * This method provides compatibility with the Java version
     * @param {string} keyType - Type of key event (aotv, etherwarp, remove)
     */
    onKeyEvent(keyType) {
        if (!this.enabled) return;
        
        switch (keyType.toLowerCase()) {
            case 'aotv':
                this.addToRoute('AOTV');
                Logger.info(this.bot, 'Added AOTV waypoint');
                break;
            case 'etherwarp':
                this.addToRoute('ETHERWARP');
                Logger.info(this.bot, 'Added Etherwarp waypoint');
                break;
            case 'remove':
                this.removeFromRoute();
                Logger.info(this.bot, 'Removed waypoint');
                break;
        }
    }
    
    /**
     * Add current position to route with specified transport method
     * @param {string} method - Transport method ('AOTV' or 'ETHERWARP')
     */
    addToRoute(method) {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            const currentPos = PlayerUtil.getBlockStandingOn(this.bot);
            handler.addToCurrentRoute(currentPos, method);
            Logger.info(this.bot, `Added ${method} waypoint at ${currentPos.x}, ${currentPos.y}, ${currentPos.z}`);
        } else {
            Logger.error(this.bot, 'RouteHandler not available');
        }
    }
    
    /**
     * Remove waypoint from route at current position
     */
    removeFromRoute() {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            const currentPos = PlayerUtil.getBlockStandingOn(this.bot);
            handler.removeFromCurrentRoute(currentPos);
            Logger.info(this.bot, `Removed waypoint at ${currentPos.x}, ${currentPos.y}, ${currentPos.z}`);
        } else {
            Logger.error(this.bot, 'RouteHandler not available');
        }
    }
    
    /**
     * Replace existing node at specified index
     * @param {number} index - Index of node to replace
     */
    replaceNode(index) {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            const currentPos = PlayerUtil.getBlockStandingOn(this.bot);
            const waypoint = new RouteWaypoint(currentPos, 'ETHERWARP');
            handler.replaceInCurrentRoute(index, waypoint);
            Logger.info(this.bot, `Replaced node ${index} with position ${currentPos.x}, ${currentPos.y}, ${currentPos.z}`);
        } else {
            Logger.error(this.bot, 'RouteHandler not available');
        }
    }
    
    /**
     * Get current route information
     * @returns {Object} Current route data
     */
    getCurrentRoute() {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            return handler.getCurrentRoute();
        }
        
        return null;
    }
    
    /**
     * Clear current route
     */
    clearRoute() {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            handler.clearCurrentRoute();
            Logger.info(this.bot, 'Cleared current route');
        }
    }
    
    /**
     * Save current route to file
     * @param {string} fileName - Name of file to save route to
     */
    saveRoute(fileName) {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            handler.saveRoute(fileName);
            Logger.info(this.bot, `Saved route to ${fileName}`);
        }
    }
    
    /**
     * Load route from file
     * @param {string} fileName - Name of file to load route from
     */
    loadRoute(fileName) {
        const routeHandler = require('../handlers/RouteHandler');
        const handler = routeHandler.getInstance ? routeHandler.getInstance(this.bot) : null;
        
        if (handler) {
            handler.loadRoute(fileName);
            Logger.info(this.bot, `Loaded route from ${fileName}`);
        }
    }
    
    /**
     * Get route statistics
     * @returns {Object} Route statistics (length, waypoints, etc.)
     */
    getRouteStats() {
        const route = this.getCurrentRoute();
        if (!route) {
            return { waypoints: 0, length: 0 };
        }
        
        return {
            waypoints: route.waypoints ? route.waypoints.length : 0,
            length: route.totalDistance || 0,
            transportMethods: this.getTransportMethodCounts(route)
        };
    }
    
    /**
     * Get count of each transport method in route
     * @param {Object} route - Route object
     * @returns {Object} Transport method counts
     */
    getTransportMethodCounts(route) {
        if (!route.waypoints) return {};
        
        const counts = {};
        route.waypoints.forEach(waypoint => {
            const method = waypoint.transportMethod || 'WALK';
            counts[method] = (counts[method] || 0) + 1;
        });
        
        return counts;
    }
}

// Transport method enumeration
RouteBuilder.TransportMethod = {
    WALK: 'WALK',
    AOTV: 'AOTV',
    ETHERWARP: 'ETHERWARP',
    JUMP: 'JUMP',
    TELEPORT: 'TELEPORT'
};

module.exports = RouteBuilder;

