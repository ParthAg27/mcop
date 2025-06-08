/**
 * RouteWaypoint - Represents a waypoint in a mining route
 * Perfect 1:1 replica of Java RouteWaypoint.java
 */

const { Vec3 } = require('vec3');

class RouteWaypoint {
    constructor(position, action = "MINE", delay = 0) {
        this.position = position instanceof Vec3 ? position : new Vec3(position.x, position.y, position.z);
        this.action = action;
        this.delay = delay;
        this.visited = false;
        this.visitCount = 0;
        this.lastVisited = null;
        this.notes = "";
    }
    
    /**
     * Get waypoint position
     * @returns {Vec3} - Position
     */
    getPosition() {
        return this.position;
    }
    
    /**
     * Set waypoint position
     * @param {Vec3} position - New position
     */
    setPosition(position) {
        this.position = position instanceof Vec3 ? position : new Vec3(position.x, position.y, position.z);
    }
    
    /**
     * Get waypoint action
     * @returns {string} - Action type
     */
    getAction() {
        return this.action;
    }
    
    /**
     * Set waypoint action
     * @param {string} action - Action type (MINE, MOVE, WAIT, etc.)
     */
    setAction(action) {
        this.action = action;
    }
    
    /**
     * Get delay at this waypoint
     * @returns {number} - Delay in milliseconds
     */
    getDelay() {
        return this.delay;
    }
    
    /**
     * Set delay at this waypoint
     * @param {number} delay - Delay in milliseconds
     */
    setDelay(delay) {
        this.delay = delay;
    }
    
    /**
     * Check if waypoint has been visited
     * @returns {boolean} - True if visited
     */
    isVisited() {
        return this.visited;
    }
    
    /**
     * Mark waypoint as visited
     */
    markVisited() {
        this.visited = true;
        this.visitCount++;
        this.lastVisited = Date.now();
    }
    
    /**
     * Reset visited status
     */
    resetVisited() {
        this.visited = false;
    }
    
    /**
     * Get visit count
     * @returns {number} - Number of times visited
     */
    getVisitCount() {
        return this.visitCount;
    }
    
    /**
     * Get last visited time
     * @returns {number|null} - Timestamp or null
     */
    getLastVisited() {
        return this.lastVisited;
    }
    
    /**
     * Get notes for this waypoint
     * @returns {string} - Notes
     */
    getNotes() {
        return this.notes;
    }
    
    /**
     * Set notes for this waypoint
     * @param {string} notes - Notes
     */
    setNotes(notes) {
        this.notes = notes;
    }
    
    /**
     * Calculate distance to another position
     * @param {Vec3} position - Target position
     * @returns {number} - Distance
     */
    distanceTo(position) {
        return this.position.distanceTo(position);
    }
    
    /**
     * Check if this waypoint is within range of a position
     * @param {Vec3} position - Target position
     * @param {number} range - Range threshold
     * @returns {boolean} - True if within range
     */
    isWithinRange(position, range) {
        return this.distanceTo(position) <= range;
    }
    
    /**
     * Clone this waypoint
     * @returns {RouteWaypoint} - Cloned waypoint
     */
    clone() {
        const cloned = new RouteWaypoint(this.position.clone(), this.action, this.delay);
        cloned.visited = this.visited;
        cloned.visitCount = this.visitCount;
        cloned.lastVisited = this.lastVisited;
        cloned.notes = this.notes;
        return cloned;
    }
    
    /**
     * Check if waypoint equals another waypoint
     * @param {RouteWaypoint} other - Other waypoint
     * @returns {boolean} - True if equal
     */
    equals(other) {
        if (!(other instanceof RouteWaypoint)) return false;
        return this.position.equals(other.position) && 
               this.action === other.action;
    }
    
    /**
     * Convert to JSON
     * @returns {Object} - JSON representation
     */
    toJSON() {
        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            action: this.action,
            delay: this.delay,
            visited: this.visited,
            visitCount: this.visitCount,
            lastVisited: this.lastVisited,
            notes: this.notes
        };
    }
    
    /**
     * Create from JSON
     * @param {Object} data - JSON data
     * @returns {RouteWaypoint} - Waypoint instance
     */
    static fromJSON(data) {
        const waypoint = new RouteWaypoint(
            new Vec3(data.position.x, data.position.y, data.position.z),
            data.action || "MINE",
            data.delay || 0
        );
        waypoint.visited = data.visited || false;
        waypoint.visitCount = data.visitCount || 0;
        waypoint.lastVisited = data.lastVisited;
        waypoint.notes = data.notes || "";
        return waypoint;
    }
    
    toString() {
        return `RouteWaypoint{pos=${this.position}, action=${this.action}, delay=${this.delay}ms, visited=${this.visited}}`;
    }
}

module.exports = RouteWaypoint;

