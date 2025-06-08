/**
 * Route - Represents a mining or navigation route
 * Perfect 1:1 replica of Java Route.java
 */

const { Vec3 } = require('vec3');
const RouteWaypoint = require('./RouteWaypoint');

class Route {
    constructor(name = "Unnamed Route") {
        this.name = name;
        this.waypoints = [];
        this.description = "";
        this.createdAt = Date.now();
        this.lastUsed = null;
    }
    
    /**
     * Get route name
     * @returns {string} - Route name
     */
    getName() {
        return this.name;
    }
    
    /**
     * Set route name
     * @param {string} name - New name
     */
    setName(name) {
        this.name = name;
    }
    
    /**
     * Get route description
     * @returns {string} - Route description
     */
    getDescription() {
        return this.description;
    }
    
    /**
     * Set route description
     * @param {string} description - New description
     */
    setDescription(description) {
        this.description = description;
    }
    
    /**
     * Add waypoint to route
     * @param {RouteWaypoint|Vec3} waypoint - Waypoint to add
     */
    addWaypoint(waypoint) {
        if (waypoint instanceof Vec3) {
            waypoint = new RouteWaypoint(waypoint);
        }
        this.waypoints.push(waypoint);
    }
    
    /**
     * Insert waypoint at specific index
     * @param {number} index - Index to insert at
     * @param {RouteWaypoint|Vec3} waypoint - Waypoint to insert
     */
    insertWaypoint(index, waypoint) {
        if (waypoint instanceof Vec3) {
            waypoint = new RouteWaypoint(waypoint);
        }
        this.waypoints.splice(index, 0, waypoint);
    }
    
    /**
     * Remove waypoint at index
     * @param {number} index - Index to remove
     * @returns {RouteWaypoint|null} - Removed waypoint or null
     */
    removeWaypoint(index) {
        if (index >= 0 && index < this.waypoints.length) {
            return this.waypoints.splice(index, 1)[0];
        }
        return null;
    }
    
    /**
     * Get waypoint at index
     * @param {number} index - Waypoint index
     * @returns {RouteWaypoint|null} - Waypoint or null
     */
    getWaypoint(index) {
        return this.waypoints[index] || null;
    }
    
    /**
     * Get all waypoints
     * @returns {Array<RouteWaypoint>} - Array of waypoints
     */
    getWaypoints() {
        return this.waypoints;
    }
    
    /**
     * Get number of waypoints
     * @returns {number} - Number of waypoints
     */
    size() {
        return this.waypoints.length;
    }
    
    /**
     * Check if route is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return this.waypoints.length === 0;
    }
    
    /**
     * Clear all waypoints
     */
    clear() {
        this.waypoints = [];
    }
    
    /**
     * Get total route distance
     * @returns {number} - Total distance
     */
    getTotalDistance() {
        let totalDistance = 0;
        for (let i = 1; i < this.waypoints.length; i++) {
            const prev = this.waypoints[i - 1].getPosition();
            const curr = this.waypoints[i].getPosition();
            totalDistance += prev.distanceTo(curr);
        }
        return totalDistance;
    }
    
    /**
     * Get waypoint positions as Vec3 array
     * @returns {Array<Vec3>} - Array of positions
     */
    getPositions() {
        return this.waypoints.map(wp => wp.getPosition());
    }
    
    /**
     * Find nearest waypoint to position
     * @param {Vec3} position - Target position
     * @returns {Object} - {waypoint, index, distance}
     */
    findNearestWaypoint(position) {
        let nearest = null;
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        
        for (let i = 0; i < this.waypoints.length; i++) {
            const distance = this.waypoints[i].getPosition().distanceTo(position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = this.waypoints[i];
                nearestIndex = i;
            }
        }
        
        return {
            waypoint: nearest,
            index: nearestIndex,
            distance: nearestDistance
        };
    }
    
    /**
     * Reverse the route
     */
    reverse() {
        this.waypoints.reverse();
    }
    
    /**
     * Clone the route
     * @returns {Route} - Cloned route
     */
    clone() {
        const cloned = new Route(this.name + " (Copy)");
        cloned.description = this.description;
        cloned.waypoints = this.waypoints.map(wp => wp.clone());
        return cloned;
    }
    
    /**
     * Optimize route by removing unnecessary waypoints
     * @param {number} threshold - Distance threshold for optimization
     */
    optimize(threshold = 2.0) {
        if (this.waypoints.length <= 2) return;
        
        const optimized = [this.waypoints[0]];
        
        for (let i = 1; i < this.waypoints.length - 1; i++) {
            const prev = optimized[optimized.length - 1].getPosition();
            const curr = this.waypoints[i].getPosition();
            const next = this.waypoints[i + 1].getPosition();
            
            // Check if current waypoint is necessary
            const directDistance = prev.distanceTo(next);
            const viaDistance = prev.distanceTo(curr) + curr.distanceTo(next);
            
            if (viaDistance - directDistance > threshold) {
                optimized.push(this.waypoints[i]);
            }
        }
        
        optimized.push(this.waypoints[this.waypoints.length - 1]);
        this.waypoints = optimized;
    }
    
    /**
     * Convert route to JSON
     * @returns {Object} - JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            createdAt: this.createdAt,
            lastUsed: this.lastUsed,
            waypoints: this.waypoints.map(wp => wp.toJSON())
        };
    }
    
    /**
     * Create route from JSON
     * @param {Object} data - JSON data
     * @returns {Route} - Route instance
     */
    static fromJSON(data) {
        const route = new Route(data.name);
        route.description = data.description || "";
        route.createdAt = data.createdAt || Date.now();
        route.lastUsed = data.lastUsed;
        route.waypoints = (data.waypoints || []).map(wp => RouteWaypoint.fromJSON(wp));
        return route;
    }
    
    /**
     * Mark route as used
     */
    markUsed() {
        this.lastUsed = Date.now();
    }
    
    toString() {
        return `Route{name="${this.name}", waypoints=${this.waypoints.length}, distance=${this.getTotalDistance().toFixed(2)}}`;
    }
}

module.exports = Route;

