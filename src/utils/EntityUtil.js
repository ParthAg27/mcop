const Logger = require('../Logger');

/**
 * Utility for entity-related operations
 * 1:1 replica of EntityUtil.java
 */
class EntityUtil {
    constructor() {
        this.logger = new Logger('EntityUtil');
    }

    /**
     * Find nearest entity of specific type
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} entityType - Type of entity to find
     * @param {number} maxDistance - Maximum search distance
     * @returns {Object|null}
     */
    static findNearestEntity(bot, entityType, maxDistance = 50) {
        if (!bot || !bot.entity || !bot.entities) return null;
        
        const playerPos = bot.entity.position;
        let nearestEntity = null;
        let nearestDistance = maxDistance;
        
        for (const [id, entity] of Object.entries(bot.entities)) {
            if (entity.type === entityType) {
                const distance = playerPos.distanceTo(entity.position);
                if (distance < nearestDistance) {
                    nearestEntity = entity;
                    nearestDistance = distance;
                }
            }
        }
        
        return nearestEntity;
    }

    /**
     * Find all entities within radius
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} radius - Search radius
     * @param {string} entityType - Optional entity type filter
     * @returns {Array}
     */
    static findEntitiesInRadius(bot, radius, entityType = null) {
        if (!bot || !bot.entity || !bot.entities) return [];
        
        const playerPos = bot.entity.position;
        const entities = [];
        
        for (const [id, entity] of Object.entries(bot.entities)) {
            if (entityType && entity.type !== entityType) continue;
            
            const distance = playerPos.distanceTo(entity.position);
            if (distance <= radius) {
                entities.push({
                    entity,
                    distance,
                    id
                });
            }
        }
        
        // Sort by distance
        entities.sort((a, b) => a.distance - b.distance);
        return entities.map(e => e.entity);
    }

    /**
     * Find hostile mobs within radius
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} radius - Search radius
     * @returns {Array}
     */
    static findHostileMobs(bot, radius = 20) {
        const entities = this.findEntitiesInRadius(bot, radius, 'mob');
        
        const hostileTypes = [
            'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
            'blaze', 'ghast', 'witch', 'slime', 'magma_cube',
            'wither_skeleton', 'pigman', 'goblin', 'ghost'
        ];
        
        return entities.filter(entity => {
            if (!entity.mobType) return false;
            const mobType = entity.mobType.toLowerCase();
            return hostileTypes.some(hostile => mobType.includes(hostile));
        });
    }

    /**
     * Find NPCs (villagers) within radius
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} radius - Search radius
     * @returns {Array}
     */
    static findNPCs(bot, radius = 30) {
        return this.findEntitiesInRadius(bot, radius, 'villager');
    }

    /**
     * Find players within radius
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} radius - Search radius
     * @param {boolean} excludeSelf - Whether to exclude the bot itself
     * @returns {Array}
     */
    static findPlayers(bot, radius = 50, excludeSelf = true) {
        const entities = this.findEntitiesInRadius(bot, radius, 'player');
        
        if (excludeSelf) {
            return entities.filter(entity => entity.username !== bot.username);
        }
        
        return entities;
    }

    /**
     * Find specific entity by name
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} name - Entity name to search for
     * @param {number} maxDistance - Maximum search distance
     * @returns {Object|null}
     */
    static findEntityByName(bot, name, maxDistance = 50) {
        if (!bot || !bot.entities) return null;
        
        const playerPos = bot.entity.position;
        const searchName = name.toLowerCase();
        
        for (const [id, entity] of Object.entries(bot.entities)) {
            const entityName = (entity.name || entity.username || '').toLowerCase();
            const displayName = (entity.displayName || '').toLowerCase();
            
            if (entityName.includes(searchName) || displayName.includes(searchName)) {
                const distance = playerPos.distanceTo(entity.position);
                if (distance <= maxDistance) {
                    return entity;
                }
            }
        }
        
        return null;
    }

    /**
     * Check if entity is valid and alive
     * @param {Object} entity - Entity to check
     * @returns {boolean}
     */
    static isValidEntity(entity) {
        if (!entity) return false;
        if (!entity.position) return false;
        if (entity.health !== undefined && entity.health <= 0) return false;
        return true;
    }

    /**
     * Get entity distance from bot
     * @param {Object} bot - Mineflayer bot instance
     * @param {Object} entity - Target entity
     * @returns {number|null}
     */
    static getEntityDistance(bot, entity) {
        if (!bot || !bot.entity || !entity || !entity.position) return null;
        return bot.entity.position.distanceTo(entity.position);
    }

    /**
     * Check if entity is within attack range
     * @param {Object} bot - Mineflayer bot instance
     * @param {Object} entity - Target entity
     * @param {number} range - Attack range
     * @returns {boolean}
     */
    static isInAttackRange(bot, entity, range = 4) {
        const distance = this.getEntityDistance(bot, entity);
        return distance !== null && distance <= range;
    }

    /**
     * Check if entity is in line of sight
     * @param {Object} bot - Mineflayer bot instance
     * @param {Object} entity - Target entity
     * @returns {boolean}
     */
    static isInLineOfSight(bot, entity) {
        if (!bot || !entity) return false;
        
        try {
            const targetPos = entity.position.offset(0, entity.height / 2, 0);
            const raycast = bot.world.raycast(bot.entity.position.offset(0, bot.entity.height, 0), targetPos.minus(bot.entity.position).normalize(), 50);
            
            // If raycast doesn't hit anything, entity is in line of sight
            return !raycast;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get entity health percentage
     * @param {Object} entity - Target entity
     * @returns {number|null}
     */
    static getEntityHealthPercentage(entity) {
        if (!entity || entity.health === undefined || entity.maxHealth === undefined) {
            return null;
        }
        
        return (entity.health / entity.maxHealth) * 100;
    }

    /**
     * Check if entity is moving
     * @param {Object} entity - Target entity
     * @param {Object} lastPosition - Last known position
     * @param {number} threshold - Movement threshold
     * @returns {boolean}
     */
    static isEntityMoving(entity, lastPosition, threshold = 0.1) {
        if (!entity || !entity.position || !lastPosition) return false;
        
        const distance = entity.position.distanceTo(lastPosition);
        return distance > threshold;
    }

    /**
     * Get entity velocity
     * @param {Object} entity - Target entity
     * @returns {Object|null}
     */
    static getEntityVelocity(entity) {
        if (!entity || !entity.velocity) return null;
        
        return {
            x: entity.velocity.x,
            y: entity.velocity.y,
            z: entity.velocity.z,
            magnitude: Math.sqrt(
                entity.velocity.x ** 2 + 
                entity.velocity.y ** 2 + 
                entity.velocity.z ** 2
            )
        };
    }

    /**
     * Predict entity position after time
     * @param {Object} entity - Target entity
     * @param {number} time - Time in seconds
     * @returns {Object|null}
     */
    static predictEntityPosition(entity, time) {
        if (!entity || !entity.position || !entity.velocity) return null;
        
        return {
            x: entity.position.x + (entity.velocity.x * time),
            y: entity.position.y + (entity.velocity.y * time),
            z: entity.position.z + (entity.velocity.z * time)
        };
    }

    /**
     * Get entities sorted by distance
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} entityType - Optional entity type filter
     * @param {number} maxDistance - Maximum distance
     * @returns {Array}
     */
    static getEntitiesSortedByDistance(bot, entityType = null, maxDistance = 50) {
        const entities = this.findEntitiesInRadius(bot, maxDistance, entityType);
        const playerPos = bot.entity.position;
        
        return entities.map(entity => ({
            entity,
            distance: playerPos.distanceTo(entity.position)
        })).sort((a, b) => a.distance - b.distance);
    }

    /**
     * Count entities of specific type
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} entityType - Entity type to count
     * @param {number} radius - Search radius
     * @returns {number}
     */
    static countEntities(bot, entityType, radius = 50) {
        return this.findEntitiesInRadius(bot, radius, entityType).length;
    }
}

module.exports = EntityUtil;

