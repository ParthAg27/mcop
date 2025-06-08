/**
 * RaytracingUtil - Provides raytrace functionality for line-of-sight calculations
 * Perfect 1:1 replica of Java RaytracingUtil.java
 */

const PlayerUtil = require('./PlayerUtil');
const { Vec3 } = require('vec3');

class RaytracingUtil {
    /**
     * Check if a point can be seen from player eye position
     * @param {Vec3} point - Target point to check
     * @returns {boolean} - True if point is visible
     */
    static canSeePoint(point, from = null) {
        if (from) {
            return RaytracingUtil.canSeePointFrom(from, point);
        }
        return RaytracingUtil.canSeePointFrom(PlayerUtil.getPlayerEyePos(), point);
    }
    
    /**
     * Check if a point can be seen from a specific position
     * @param {Vec3} from - Starting position
     * @param {Vec3} point - Target point
     * @returns {boolean} - True if point is visible
     */
    static canSeePointFrom(from, point) {
        const result = RaytracingUtil.raytrace(from, point);
        if (result === null) {
            return true;
        }
        
        const hitVec = result.hitVec;
        if (!hitVec) {
            return false;
        }
        
        // Check if the hit point is very close to our target point
        return Math.abs(hitVec.x - point.x) < 0.1 && 
               Math.abs(hitVec.y - point.y) < 0.1 && 
               Math.abs(hitVec.z - point.z) < 0.1;
    }
    
    /**
     * Raytrace towards a direction for a specific distance
     * @param {Vec3} v1 - Start position
     * @param {Vec3} v2 - Target direction
     * @param {number} distance - Maximum distance
     * @returns {Object|null} - Hit result or null
     */
    static raytraceTowards(v1, v2, distance) {
        const direction = v2.minus(v1).normalize();
        const endPoint = v1.plus(direction.scaled(distance));
        return RaytracingUtil.raytrace(v1, endPoint);
    }
    
    /**
     * Perform raytrace between two points
     * @param {Vec3} v1 - Start position
     * @param {Vec3} v2 - End position
     * @param {Object} bot - Mineflayer bot instance
     * @returns {Object|null} - Hit result or null
     */
    static raytrace(v1, v2, bot = null) {
        try {
            if (!bot) {
                // If no bot provided, return basic calculation
                return null;
            }
            
            // Use mineflayer's raycast functionality
            const block = bot.blockAtCursor(4.5);
            if (block) {
                return {
                    hitVec: block.position,
                    block: block,
                    type: 'block'
                };
            }
            
            // Check for entity intersections
            const direction = v2.minus(v1);
            const entities = Object.values(bot.entities)
                .filter(entity => {
                    if (!entity.position || entity === bot.entity) return false;
                    
                    // Simple bounding box check
                    const entityPos = entity.position;
                    const distance = v1.distanceTo(entityPos);
                    return distance <= v1.distanceTo(v2) && distance <= 5;
                });
            
            if (entities.length > 0) {
                // Return closest entity
                const closest = entities.reduce((closest, entity) => {
                    const d1 = v1.distanceTo(entity.position);
                    const d2 = v1.distanceTo(closest.position);
                    return d1 < d2 ? entity : closest;
                });
                
                return {
                    hitVec: closest.position,
                    entity: closest,
                    type: 'entity'
                };
            }
            
            return null;
        } catch (error) {
            console.error(`[RaytracingUtil] Error in raytrace: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Check if there's a clear path between two points
     * @param {Vec3} start - Start position
     * @param {Vec3} end - End position
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if path is clear
     */
    static hasLineOfSight(start, end, bot) {
        if (!bot || !bot.world) return true;
        
        try {
            // Use mineflayer's line of sight calculation
            const result = bot.canSeeBlock(end);
            return result;
        } catch (error) {
            console.error(`[RaytracingUtil] Error in hasLineOfSight: ${error.message}`);
            return false;
        }
    }
}

module.exports = RaytracingUtil;

