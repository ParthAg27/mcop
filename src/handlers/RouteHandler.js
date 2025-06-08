/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.handler.RouteHandler
 * Manages route loading, caching, and execution
 */
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../util/Logger');
const Route = require('../util/helper/route/Route');
const Graph = require('../util/helper/graph/Graph');

class RouteHandler {
    static instance = null;
    
    constructor() {
        this.routes = new Map();
        this.graphs = new Map();
        this.routesDirectory = path.join(__dirname, '../../config/mightyminerv2/graphs');
        this.loadedRoutes = new Set();
        
        RouteHandler.instance = this;
    }
    
    static getInstance() {
        if (!RouteHandler.instance) {
            new RouteHandler();
        }
        return RouteHandler.instance;
    }
    
    // EXACT replica of loadRoute from Java
    loadRoute(routeName) {
        if (!routeName || typeof routeName !== 'string') {
            Logger.sendWarning('Invalid route name provided');
            return null;
        }
        
        try {
            // Check if already loaded
            if (this.routes.has(routeName)) {
                return this.routes.get(routeName);
            }
            
            const routeFile = path.join(this.routesDirectory, `${routeName}.json`);
            
            if (!fs.existsSync(routeFile)) {
                Logger.sendWarning(`Route file not found: ${routeFile}`);
                return null;
            }
            
            const routeData = fs.readJsonSync(routeFile);
            const route = this.deserializeRoute(routeData);
            
            if (route) {
                this.routes.set(routeName, route);
                this.loadedRoutes.add(routeName);
                Logger.sendLog(`Successfully loaded route: ${routeName}`);
                return route;
            } else {
                Logger.sendWarning(`Failed to deserialize route: ${routeName}`);
                return null;
            }
        } catch (error) {
            Logger.sendError(`Error loading route ${routeName}: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of saveRoute from Java
    saveRoute(routeName, route) {
        if (!routeName || !route) {
            Logger.sendWarning('Invalid route name or route data');
            return false;
        }
        
        try {
            const routeFile = path.join(this.routesDirectory, `${routeName}.json`);
            
            // Ensure directory exists
            fs.ensureDirSync(this.routesDirectory);
            
            const routeData = this.serializeRoute(route);
            fs.writeJsonSync(routeFile, routeData, { spaces: 2 });
            
            // Update cache
            this.routes.set(routeName, route);
            this.loadedRoutes.add(routeName);
            
            Logger.sendLog(`Successfully saved route: ${routeName}`);
            return true;
        } catch (error) {
            Logger.sendError(`Error saving route ${routeName}: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of getRoute from Java
    getRoute(routeName) {
        if (!routeName) return null;
        
        // Try to get from cache first
        if (this.routes.has(routeName)) {
            return this.routes.get(routeName);
        }
        
        // Try to load if not in cache
        return this.loadRoute(routeName);
    }
    
    // EXACT replica of getAllRoutes from Java
    getAllRoutes() {
        try {
            if (!fs.existsSync(this.routesDirectory)) {
                return [];
            }
            
            const files = fs.readdirSync(this.routesDirectory)
                .filter(file => file.endsWith('.json'))
                .map(file => path.basename(file, '.json'));
            
            return files;
        } catch (error) {
            Logger.sendError(`Error getting all routes: ${error.message}`);
            return [];
        }
    }
    
    // EXACT replica of deleteRoute from Java
    deleteRoute(routeName) {
        if (!routeName) {
            Logger.sendWarning('Invalid route name for deletion');
            return false;
        }
        
        try {
            const routeFile = path.join(this.routesDirectory, `${routeName}.json`);
            
            if (fs.existsSync(routeFile)) {
                fs.removeSync(routeFile);
            }
            
            // Remove from cache
            this.routes.delete(routeName);
            this.loadedRoutes.delete(routeName);
            
            Logger.sendLog(`Successfully deleted route: ${routeName}`);
            return true;
        } catch (error) {
            Logger.sendError(`Error deleting route ${routeName}: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of refreshRoutes from Java
    refreshRoutes() {
        try {
            Logger.sendLog('Refreshing all routes...');
            
            // Clear cache
            this.routes.clear();
            this.loadedRoutes.clear();
            
            // Reload all routes
            const allRoutes = this.getAllRoutes();
            let loadedCount = 0;
            
            for (const routeName of allRoutes) {
                if (this.loadRoute(routeName)) {
                    loadedCount++;
                }
            }
            
            Logger.sendLog(`Refreshed ${loadedCount}/${allRoutes.length} routes`);
            return loadedCount;
        } catch (error) {
            Logger.sendError(`Error refreshing routes: ${error.message}`);
            return 0;
        }
    }
    
    // EXACT replica of serializeRoute from Java
    serializeRoute(route) {
        try {
            return {
                name: route.name,
                description: route.description || '',
                waypoints: route.waypoints?.map(wp => ({
                    x: wp.x,
                    y: wp.y,
                    z: wp.z,
                    type: wp.type,
                    data: wp.data || {}
                })) || [],
                metadata: {
                    created: route.created || Date.now(),
                    modified: Date.now(),
                    version: route.version || '1.0.0',
                    author: route.author || 'MightyMiner'
                },
                settings: route.settings || {}
            };
        } catch (error) {
            Logger.sendError(`Error serializing route: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of deserializeRoute from Java
    deserializeRoute(data) {
        try {
            if (!data || typeof data !== 'object') {
                Logger.sendWarning('Invalid route data for deserialization');
                return null;
            }
            
            const route = new Route(data.name);
            route.description = data.description || '';
            route.waypoints = data.waypoints || [];
            route.metadata = data.metadata || {};
            route.settings = data.settings || {};
            route.created = data.metadata?.created || Date.now();
            route.version = data.metadata?.version || '1.0.0';
            route.author = data.metadata?.author || 'MightyMiner';
            
            return route;
        } catch (error) {
            Logger.sendError(`Error deserializing route: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of validateRoute from Java
    validateRoute(route) {
        if (!route) {
            return { valid: false, errors: ['Route is null or undefined'] };
        }
        
        const errors = [];
        
        if (!route.name || typeof route.name !== 'string') {
            errors.push('Route name is required and must be a string');
        }
        
        if (!route.waypoints || !Array.isArray(route.waypoints)) {
            errors.push('Route waypoints must be an array');
        } else if (route.waypoints.length === 0) {
            errors.push('Route must have at least one waypoint');
        } else {
            // Validate each waypoint
            route.waypoints.forEach((wp, index) => {
                if (!wp || typeof wp !== 'object') {
                    errors.push(`Waypoint ${index} is invalid`);
                } else {
                    if (typeof wp.x !== 'number' || typeof wp.y !== 'number' || typeof wp.z !== 'number') {
                        errors.push(`Waypoint ${index} coordinates must be numbers`);
                    }
                }
            });
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Utility methods
    getLoadedRouteNames() {
        return Array.from(this.loadedRoutes);
    }
    
    getRouteCount() {
        return this.routes.size;
    }
    
    clearCache() {
        this.routes.clear();
        this.loadedRoutes.clear();
        Logger.sendLog('Route cache cleared');
    }
    
    isRouteLoaded(routeName) {
        return this.routes.has(routeName);
    }
}

module.exports = RouteHandler;

