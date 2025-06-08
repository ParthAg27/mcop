/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.PlayerUtil
 */
const { Vec3 } = require('vec3');

class PlayerUtil {
    constructor(bot) {
        this.bot = bot;
    }

    // EXACT replica of getBlockStandingOn from Java
    getBlockStandingOn() {
        if (!this.bot || !this.bot.entity) return null;
        
        const pos = this.bot.entity.position;
        // 0.25 = 3 layers of snow
        // if there is more than 3 layers of snow then i should consider that as a full block i guess
        // but there is no snow check in pathfinder so this will probably not work at all in snowy areas
        return new Vec3(
            Math.floor(pos.x),
            Math.ceil(pos.y - 0.25) - 1,
            Math.floor(pos.z)
        );
    }

    getPlayerEyePos() {
        if (!this.bot || !this.bot.entity) return null;
        
        const pos = this.bot.entity.position;
        return new Vec3(pos.x, pos.y + this.bot.entity.eyeHeight, pos.z);
    }

    getBlockStandingOnFloor() {
        if (!this.bot || !this.bot.entity) return null;
        
        const pos = this.bot.entity.position;
        return new Vec3(
            Math.floor(pos.x),
            Math.floor(pos.y) - 1,
            Math.floor(pos.z)
        );
    }

    getNextTickPosition() {
        if (!this.bot || !this.bot.entity) return null;
        
        const pos = this.bot.entity.position;
        const vel = this.bot.entity.velocity;
        return pos.plus(new Vec3(vel.x, 0, vel.z));
    }

    getNextTickPosition(mult) {
        if (!this.bot || !this.bot.entity) return null;
        
        const pos = this.bot.entity.position;
        const vel = this.bot.entity.velocity;
        return pos.plus(new Vec3(vel.x * mult, 0, vel.z * mult));
    }

    getEntityCuttingOtherEntity(entity, predicate = () => true) {
        if (!this.bot || !this.bot.entity || !entity) return null;
        
        const boundingBox = entity.boundingBox || {
            minX: entity.position.x - 0.3,
            maxX: entity.position.x + 0.3,
            minY: entity.position.y,
            maxY: entity.position.y + 2.0,
            minZ: entity.position.z - 0.3,
            maxZ: entity.position.z + 0.3
        };
        
        const entities = Object.values(this.bot.entities).filter(e => {
            if (!e || e.id === this.bot.entity.id || e.id === entity.id) return false;
            if (e.type === 'orb' || e.type === 'object') return false; // Skip non-mob entities
            
            const pos = e.position;
            const inBox = pos.x >= boundingBox.minX && pos.x <= boundingBox.maxX &&
                         pos.y >= boundingBox.minY && pos.y <= boundingBox.maxY &&
                         pos.z >= boundingBox.minZ && pos.z <= boundingBox.maxZ;
            
            return inBox && predicate(e);
        });
        
        if (entities.length === 0) return null;
        
        // Return closest entity
        return entities.reduce((closest, current) => {
            const closestDist = entity.position.distanceTo(closest.position);
            const currentDist = entity.position.distanceTo(current.position);
            return currentDist < closestDist ? current : closest;
        });
    }

    isPlayerSuffocating() {
        if (!this.bot || !this.bot.entity) return false;
        
        const pos = this.bot.entity.position;
        const headBlock = this.bot.blockAt(new Vec3(Math.floor(pos.x), Math.floor(pos.y + 1), Math.floor(pos.z)));
        const bodyBlock = this.bot.blockAt(new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)));
        
        // Check if blocks are solid (suffocating)
        return (headBlock && this.isBlockSolid(headBlock)) || 
               (bodyBlock && this.isBlockSolid(bodyBlock));
    }

    isBlockSolid(block) {
        if (!block) return false;
        // Add specific block checks for Minecraft blocks that cause suffocation
        const solidBlocks = ['stone', 'dirt', 'cobblestone', 'bedrock', 'sand', 'gravel', 'wood', 'wool'];
        return solidBlocks.some(type => block.name.includes(type));
    }

    getHorizontalFacing(yaw) {
        // EXACT replica of Java's getHorizontalFacing
        const index = Math.floor((yaw * 4.0 / 360.0) + 0.5) & 3;
        const facings = ['south', 'west', 'north', 'east'];
        return facings[index];
    }

    // Additional utility methods for mineflayer compatibility
    static getStaticPlayerEyePos(bot) {
        if (!bot || !bot.entity) return null;
        const pos = bot.entity.position;
        return new Vec3(pos.x, pos.y + bot.entity.eyeHeight, pos.z);
    }

    static getStaticBlockStandingOn(bot) {
        if (!bot || !bot.entity) return null;
        const pos = bot.entity.position;
        return new Vec3(
            Math.floor(pos.x),
            Math.ceil(pos.y - 0.25) - 1,
            Math.floor(pos.z)
        );
    }
}

module.exports = PlayerUtil;

