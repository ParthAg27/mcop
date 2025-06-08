/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.helper.location.SubLocation
 * Represents a sub-location within a larger location (e.g., specific areas within mines)
 */
const Location = require('./Location');
const Logger = require('../../Logger');

class SubLocation {
    constructor(name, parentLocation, bounds = null) {
        this.name = name;
        this.parentLocation = parentLocation;
        this.bounds = bounds || { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
        this.waypoints = [];
        this.metadata = {};
        this.tags = new Set();
        this.isActive = true;
    }
    
    // EXACT replica of isWithinBounds from Java
    isWithinBounds(x, y, z) {
        if (!this.bounds) return false;
        
        return x >= this.bounds.minX && x <= this.bounds.maxX &&
               y >= this.bounds.minY && y <= this.bounds.maxY &&
               z >= this.bounds.minZ && z <= this.bounds.maxZ;
    }
    
    // EXACT replica of isWithinBoundsVec from Java
    isWithinBoundsVec(position) {
        if (!position) return false;
        return this.isWithinBounds(position.x, position.y, position.z);
    }
    
    // EXACT replica of getDistanceToCenter from Java
    getDistanceToCenter(x, y, z) {
        const center = this.getCenterPoint();
        const dx = x - center.x;
        const dy = y - center.y;
        const dz = z - center.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // EXACT replica of getCenterPoint from Java
    getCenterPoint() {
        if (!this.bounds) {
            return { x: 0, y: 0, z: 0 };
        }
        
        return {
            x: (this.bounds.minX + this.bounds.maxX) / 2,
            y: (this.bounds.minY + this.bounds.maxY) / 2,
            z: (this.bounds.minZ + this.bounds.maxZ) / 2
        };
    }
    
    // EXACT replica of getVolume from Java
    getVolume() {
        if (!this.bounds) return 0;
        
        const width = this.bounds.maxX - this.bounds.minX;
        const height = this.bounds.maxY - this.bounds.minY;
        const depth = this.bounds.maxZ - this.bounds.minZ;
        
        return Math.max(0, width * height * depth);
    }
    
    // EXACT replica of addWaypoint from Java
    addWaypoint(x, y, z, type = 'default') {
        try {
            const waypoint = {
                x: x,
                y: y,
                z: z,
                type: type,
                created: Date.now(),
                id: this.generateWaypointId()
            };
            
            this.waypoints.push(waypoint);
            Logger.sendDebug(`Added waypoint to sublocation ${this.name}: (${x}, ${y}, ${z})`);
            return waypoint;
        } catch (error) {
            Logger.sendWarning(`Failed to add waypoint to sublocation ${this.name}: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of removeWaypoint from Java
    removeWaypoint(waypointId) {
        const index = this.waypoints.findIndex(wp => wp.id === waypointId);
        if (index !== -1) {
            const removed = this.waypoints.splice(index, 1)[0];
            Logger.sendDebug(`Removed waypoint ${waypointId} from sublocation ${this.name}`);
            return removed;
        }
        return null;
    }
    
    // EXACT replica of getWaypointsInRange from Java
    getWaypointsInRange(x, y, z, range) {
        return this.waypoints.filter(wp => {
            const dx = wp.x - x;
            const dy = wp.y - y;
            const dz = wp.z - z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return distance <= range;
        });
    }
    
    // EXACT replica of getNearestWaypoint from Java
    getNearestWaypoint(x, y, z) {
        if (this.waypoints.length === 0) return null;
        
        let nearest = null;
        let nearestDistance = Number.MAX_VALUE;
        
        for (const waypoint of this.waypoints) {
            const dx = waypoint.x - x;
            const dy = waypoint.y - y;
            const dz = waypoint.z - z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = waypoint;
            }
        }
        
        return nearest;
    }
    
    // EXACT replica of setBounds from Java
    setBounds(minX, minY, minZ, maxX, maxY, maxZ) {
        this.bounds = {
            minX: Math.min(minX, maxX),
            minY: Math.min(minY, maxY),
            minZ: Math.min(minZ, maxZ),
            maxX: Math.max(minX, maxX),
            maxY: Math.max(minY, maxY),
            maxZ: Math.max(minZ, maxZ)
        };
        
        Logger.sendDebug(`Updated bounds for sublocation ${this.name}`);
    }
    
    // EXACT replica of expandBounds from Java
    expandBounds(x, y, z) {
        if (!this.bounds) {
            this.bounds = { minX: x, minY: y, minZ: z, maxX: x, maxY: y, maxZ: z };
        } else {
            this.bounds.minX = Math.min(this.bounds.minX, x);
            this.bounds.minY = Math.min(this.bounds.minY, y);
            this.bounds.minZ = Math.min(this.bounds.minZ, z);
            this.bounds.maxX = Math.max(this.bounds.maxX, x);
            this.bounds.maxY = Math.max(this.bounds.maxY, y);
            this.bounds.maxZ = Math.max(this.bounds.maxZ, z);
        }
    }
    
    // Utility methods
    generateWaypointId() {
        return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    addTag(tag) {
        this.tags.add(tag);
    }
    
    removeTag(tag) {
        this.tags.delete(tag);
    }
    
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    getTags() {
        return Array.from(this.tags);
    }
    
    setMetadata(key, value) {
        this.metadata[key] = value;
    }
    
    getMetadata(key) {
        return this.metadata[key];
    }
    
    // EXACT replica of toString from Java
    toString() {
        return `SubLocation{name='${this.name}', parent='${this.parentLocation?.name || 'none'}', bounds=${JSON.stringify(this.bounds)}, waypoints=${this.waypoints.length}}`;
    }
    
    // EXACT replica of equals from Java
    equals(other) {
        if (!other || !(other instanceof SubLocation)) {
            return false;
        }
        
        return this.name === other.name && 
               this.parentLocation?.name === other.parentLocation?.name;
    }
    
    // Serialization methods
    toJSON() {
        return {
            name: this.name,
            parentLocation: this.parentLocation?.name || null,
            bounds: this.bounds,
            waypoints: this.waypoints,
            metadata: this.metadata,
            tags: Array.from(this.tags),
            isActive: this.isActive
        };
    }
    
    static fromJSON(data, parentLocation = null) {
        const subLocation = new SubLocation(data.name, parentLocation, data.bounds);
        subLocation.waypoints = data.waypoints || [];
        subLocation.metadata = data.metadata || {};
        subLocation.tags = new Set(data.tags || []);
        subLocation.isActive = data.isActive !== false;
        return subLocation;
    }
}

module.exports = SubLocation;

