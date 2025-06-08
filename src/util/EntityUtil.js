const Logger = require('../core/Logger');
const TablistUtil = require('./TablistUtil');
const AngleUtil = require('./AngleUtil');
const MightyMinerConfig = require('../core/MightyMinerConfig');
const { Vec3 } = require('vec3');

/**
 * EntityUtil
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.util.EntityUtil
 * Handles entity-related utilities and operations
 */
class EntityUtil {
    static logger = new Logger('EntityUtil');
    static bot = null;

    static init(bot) {
        this.bot = bot;
    }

    /**
     * Checks if an entity is an NPC (exact replica from Java)
     * @param entity Entity to check
     * @return True if entity is NPC
     */
    static isNpc(entity) {
        if (!entity) {
            return false;
        }
        
        // Check if it's a player entity
        if (!entity.type || entity.type !== 'player') {
            return false;
        }
        
        // Check if player is in tablist (real players are in tablist, NPCs are not)
        const tablistPlayers = TablistUtil.getTabListPlayersSkyblock();
        return !tablistPlayers.includes(entity.username || entity.name || '');
    }

    /**
     * Gets the block position an entity is standing on
     * @param entity Entity to check
     * @return BlockPos object
     */
    static getBlockStandingOn(entity) {
        if (!entity || !entity.position) {
            return null;
        }
        
        return {
            x: Math.floor(entity.position.x),
            y: Math.floor(Math.ceil(entity.position.y - 0.25) - 1),
            z: Math.floor(entity.position.z)
        };
    }

    /**
     * Gets the entity the player is looking at
     * @return Entity or null
     */
    static getEntityLookingAt() {
        if (!this.bot) return null;
        
        try {
            // Get entity in crosshair (if available in mineflayer)
            const entity = this.bot.entityAtCursor();
            return entity || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Checks if an armor stand is dead based on name
     * @param name Armor stand name
     * @return True if dead
     */
    static isStandDead(name) {
        return this.getHealthFromStandName(name) === 0;
    }

    /**
     * Extracts health value from armor stand name
     * @param name Armor stand name
     * @return Health value
     */
    static getHealthFromStandName(name) {
        let health = 0;
        try {
            const parts = name.split(' ');
            const healthPart = parts[parts.length - 1];
            const healthStr = healthPart.split('/')[0].replace(/,/g, '');
            health = parseInt(healthStr);
        } catch (error) {
            // Ignore parsing errors
        }
        return health || 0;
    }

    /**
     * Gets entity cutting/intersecting with another entity
     * @param entity Base entity
     * @param entityType Entity type filter
     * @return Intersecting entity or null
     */
    static getEntityCuttingOtherEntity(entity, entityType = null) {
        if (!this.bot || !entity) return null;

        try {
            const entities = Object.values(this.bot.entities);
            const basePos = entity.position;
            
            // Expand bounding box (0.3, 2.0, 0.3)
            const expandX = 0.3;
            const expandY = 2.0;
            const expandZ = 0.3;
            
            const candidates = entities.filter(e => {
                if (!e.position) return false;
                if (e === entity) return false;
                if (e === this.bot.entity) return false;
                if (e.type === 'armor_stand') return false;
                if (e.type === 'fireball') return false;
                if (e.type === 'fishing_bobber') return false;
                
                // Check entity type filter
                if (entityType && e.type !== entityType) return false;
                
                // Check if within expanded bounding box
                const dx = Math.abs(e.position.x - basePos.x);
                const dy = Math.abs(e.position.y - basePos.y);
                const dz = Math.abs(e.position.z - basePos.z);
                
                return dx <= expandX && dy <= expandY && dz <= expandZ;
            });
            
            if (candidates.length === 0) return null;
            
            // Return closest entity
            return candidates.reduce((closest, current) => {
                const closestDist = basePos.distanceTo(closest.position);
                const currentDist = basePos.distanceTo(current.position);
                return currentDist < closestDist ? current : closest;
            });
        } catch (error) {
            this.logger.error('Error getting cutting entity:', error);
            return null;
        }
    }

    /**
     * Gets entities by name with filtering (exact replica from Java)
     * @param entityNames Set of entity names to search for
     * @param entitiesToIgnore Set of entities to ignore
     * @return Sorted list of entities
     */
    static getEntities(entityNames, entitiesToIgnore = new Set()) {
        if (!this.bot) return [];

        try {
            const entities = [];
            const allEntities = Object.values(this.bot.entities);
            const playerPos = this.bot.entity.position;
            const normalizedYaw = AngleUtil.normalizeAngle(this.bot.entity.yaw);
            
            // Filter armor stands with matching names
            const armorStands = allEntities.filter(entity => {
                return entity.type === 'armor_stand' &&
                       entity.customName &&
                       !entity.customName.includes(this.bot.username) &&
                       entityNames.some(name => entity.customName.includes(name)) &&
                       !entity.isDead;
            });
            
            // For each armor stand, find the associated living entity
            for (const armorStand of armorStands) {
                const livingEntity = this.getEntityCuttingOtherEntity(armorStand);
                if (livingEntity && 
                    livingEntity.type !== 'player' &&
                    !entitiesToIgnore.has(livingEntity) &&
                    livingEntity !== this.bot.entity &&
                    livingEntity.health > 0) {
                    entities.push(livingEntity);
                }
            }
            
            // Sort by distance and angle cost (exact replica from Java)
            return entities
                .filter(entity => entity.health > 0)
                .sort((a, b) => {
                    const aPosVec = a.position;
                    const bPosVec = b.position;
                    
                    const aDistanceCost = playerPos.distanceTo(aPosVec);
                    const bDistanceCost = playerPos.distanceTo(bPosVec);
                    
                    const aAngleCost = Math.abs(AngleUtil.getNeededYawChange(
                        normalizedYaw, 
                        AngleUtil.getRotationYaw(aPosVec)
                    ));
                    const bAngleCost = Math.abs(AngleUtil.getNeededYawChange(
                        normalizedYaw, 
                        AngleUtil.getRotationYaw(bPosVec)
                    ));
                    
                    // Use config values with defaults
                    const distWeight = (MightyMinerConfig.devMKillDist || 50) / 100;
                    const rotWeight = (MightyMinerConfig.devMKillRot || 50) / 100;
                    
                    const aCost = aDistanceCost * distWeight + aAngleCost * rotWeight;
                    const bCost = bDistanceCost * distWeight + bAngleCost * rotWeight;
                    
                    return aCost - bCost;
                });
        } catch (error) {
            this.logger.error('Error getting entities:', error);
            return [];
        }
    }

    /**
     * Packs coordinates into long (utility function from Java)
     * @param x X coordinate
     * @param z Z coordinate
     * @return Packed long value
     */
    static pack(x, z) {
        // JavaScript equivalent of Java's bit shifting
        return (x << 32) | (z & 0xFFFFFFFF);
    }

    /**
     * Gets all entities within radius
     * @param position Center position
     * @param radius Search radius
     * @param entityType Optional entity type filter
     * @return Array of entities
     */
    static getEntitiesInRadius(position, radius, entityType = null) {
        if (!this.bot || !position) return [];

        try {
            const entities = Object.values(this.bot.entities);
            
            return entities.filter(entity => {
                if (!entity.position) return false;
                if (entity === this.bot.entity) return false;
                if (entityType && entity.type !== entityType) return false;
                
                const distance = position.distanceTo(entity.position);
                return distance <= radius;
            });
        } catch (error) {
            this.logger.error('Error getting entities in radius:', error);
            return [];
        }
    }

    /**
     * Gets the closest entity to a position
     * @param position Reference position
     * @param entityType Optional entity type filter
     * @return Closest entity or null
     */
    static getClosestEntity(position, entityType = null) {
        const entities = this.getEntitiesInRadius(position, 50, entityType);
        
        if (entities.length === 0) return null;
        
        return entities.reduce((closest, current) => {
            const closestDist = position.distanceTo(closest.position);
            const currentDist = position.distanceTo(current.position);
            return currentDist < closestDist ? current : closest;
        });
    }

    /**
     * Checks if entity is a mob/hostile entity
     * @param entity Entity to check
     * @return True if mob
     */
    static isMob(entity) {
        if (!entity) return false;
        
        const mobTypes = [
            'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
            'witch', 'slime', 'magma_cube', 'ghast', 'blaze',
            'cave_spider', 'silverfish', 'endermite', 'guardian',
            'elder_guardian', 'shulker', 'phantom', 'drowned',
            'husk', 'stray', 'wither_skeleton', 'zombie_villager'
        ];
        
        return mobTypes.includes(entity.type);
    }

    /**
     * Checks if entity is alive
     * @param entity Entity to check
     * @return True if alive
     */
    static isEntityAlive(entity) {
        return entity && !entity.isDead && entity.health > 0;
    }

    /**
     * Gets entity's display name or username
     * @param entity Entity
     * @return Display name
     */
    static getEntityName(entity) {
        if (!entity) return '';
        
        return entity.displayName || entity.customName || entity.username || entity.name || '';
    }

    /**
     * Gets all player entities (excluding self)
     * @return Array of player entities
     */
    static getPlayers() {
        if (!this.bot) return [];
        
        return Object.values(this.bot.entities)
            .filter(entity => 
                entity.type === 'player' && 
                entity !== this.bot.entity
            );
    }

    /**
     * Gets all NPCs
     * @return Array of NPC entities
     */
    static getNpcs() {
        return this.getPlayers().filter(entity => this.isNpc(entity));
    }

    /**
     * Debug method to log entity information
     */
    static debugEntities() {
        if (!this.bot) return;
        
        this.logger.info('=== ENTITY DEBUG ===');
        const entities = Object.values(this.bot.entities);
        this.logger.info(`Total entities: ${entities.length}`);
        
        const entityCounts = {};
        entities.forEach(entity => {
            const type = entity.type || 'unknown';
            entityCounts[type] = (entityCounts[type] || 0) + 1;
        });
        
        Object.entries(entityCounts).forEach(([type, count]) => {
            this.logger.info(`${type}: ${count}`);
        });
        
        this.logger.info('===================');
    }
}

module.exports = EntityUtil;

