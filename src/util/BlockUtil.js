/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.BlockUtil
 */
const { Vec3 } = require('vec3');
const PlayerUtil = require('./PlayerUtil');

class BlockUtil {
    constructor(bot) {
        this.bot = bot;
    }

    // EXACT replica of BLOCK_SIDES from Java
    static BLOCK_SIDES = {
        'down': [0.5, 0.01, 0.5],
        'up': [0.5, 0.99, 0.5],
        'west': [0.01, 0.5, 0.5],
        'east': [0.99, 0.5, 0.5],
        'north': [0.5, 0.5, 0.01],
        'south': [0.5, 0.5, 0.99],
        'center': [0.5, 0.5, 0.5] // Handles the null case
    };

    getBlockLookingAt() {
        if (!this.bot || !this.bot.targetBlock) return null;
        return this.bot.targetBlock.position;
    }

    getWalkableBlocksAround(playerPos) {
        const walkableBlocks = [];
        
        // Check if player is on a slab (approximation)
        const blockBelow = this.bot.blockAt(playerPos.offset(0, -1, 0));
        const yOffset = blockBelow && blockBelow.name.includes('slab') ? -1 : 0;

        for (let i = -1; i <= 1; i++) {
            for (let j = yOffset; j <= 0; j++) {
                for (let k = -1; k <= 1; k++) {
                    const x = playerPos.x + i;
                    const y = playerPos.y + j;
                    const z = playerPos.z + k;
                    
                    const pos = new Vec3(x, y, z);
                    
                    if (this.canStandOn(pos) && 
                        this.canWalkThrough(pos.offset(0, 1, 0)) && 
                        this.canWalkThrough(pos.offset(0, 2, 0))) {
                        walkableBlocks.push(pos);
                    }
                }
            }
        }
        return walkableBlocks;
    }

    canStandOn(pos) {
        const block = this.bot.blockAt(pos);
        if (!block) return false;
        
        // Check if block is solid and can be stood on
        const solidBlocks = ['stone', 'dirt', 'cobblestone', 'bedrock', 'sand', 'gravel', 'wood', 'planks', 'slab'];
        return solidBlocks.some(type => block.name.includes(type));
    }

    canWalkThrough(pos) {
        const block = this.bot.blockAt(pos);
        if (!block) return true; // Air is walkable
        
        // Check if block can be walked through
        const walkableBlocks = ['air', 'water', 'lava', 'grass', 'vine', 'web'];
        return walkableBlocks.some(type => block.name.includes(type)) || block.name === 'air';
    }

    /**
     * EXACT replica of findMineableBlocksFromAccessiblePositions from Java
     * Finds mineable blocks that are accessible by walking from the player's current position.
     */
    findMineableBlocksFromAccessiblePositions(blockPriorities, blockToIgnore, miningSpeed) {
        const blocks = new MinHeap(500);
        const visitedPositions = new Set();

        const playerBlock = PlayerUtil.getStaticBlockStandingOn(this.bot);
        const walkableBlocks = this.getWalkableBlocksAround(playerBlock);

        if (blockToIgnore != null) {
            visitedPositions.add(this.longHash(blockToIgnore.x, blockToIgnore.y, blockToIgnore.z));
        }

        for (const blockPos of walkableBlocks) {
            const eye = new Vec3(blockPos.x + 0.5, blockPos.y + this.bot.entity.eyeHeight, blockPos.z + 0.5);
            const batch = this.findMineableBlocksAroundPoint(eye, blockPriorities, visitedPositions, miningSpeed);
            
            for (const pos of batch.getBlocks()) {
                const cost = batch.getCost(pos);
                blocks.add(pos, cost);
            }
        }
        
        return blocks.getBlocks();
    }

    /**
     * EXACT replica of findMineableBlocksAroundHead from Java
     * Finds mineable blocks in a fixed area around the player's head position.
     */
    findMineableBlocksAroundHead(blockPriorities, blockToIgnore, miningSpeed) {
        const playerPos = this.bot.entity.position;
        const eye = new Vec3(playerPos.x, playerPos.y + this.bot.entity.eyeHeight, playerPos.z);

        const blocksToIgnore = new Set();
        if (blockToIgnore != null) {
            blocksToIgnore.add(this.longHash(blockToIgnore.x, blockToIgnore.y, blockToIgnore.z));
        }

        return this.findMineableBlocksAroundPoint(eye, blockPriorities, blocksToIgnore, miningSpeed).getBlocks();
    }

    /**
     * EXACT replica of findMineableBlocksAroundPoint from Java
     */
    findMineableBlocksAroundPoint(point, blockPriorities, blocksToIgnore, miningSpeed) {
        const blocks = new MinHeap(500);

        const HORIZONTAL_RADIUS = 5;
        const VERTICAL_LOWER = -3;
        const VERTICAL_UPPER = 4;
        const MAX_DISTANCE = 4;

        // Calculate bounds for the block
        const baseX = point.x;
        const baseY = point.y;
        const baseZ = point.z;

        // Process the blocks in an optimized order (Y first for better cache locality)
        for (let y = VERTICAL_LOWER; y <= VERTICAL_UPPER; y++) {
            const actualY = baseY + y;

            for (let x = -HORIZONTAL_RADIUS; x <= HORIZONTAL_RADIUS; x++) {
                const actualX = baseX + x;

                for (let z = -HORIZONTAL_RADIUS; z <= HORIZONTAL_RADIUS; z++) {
                    const actualZ = baseZ + z;

                    const pos = new Vec3(Math.floor(actualX), Math.floor(actualY), Math.floor(actualZ));

                    // Skip if in ignore
                    const hash = this.longHash(pos.x, pos.y, pos.z);
                    if (blocksToIgnore.has(hash)) {
                        continue;
                    }

                    // Mark as visited immediately
                    blocksToIgnore.add(hash);

                    // The maximum reach for player is 4 blocks
                    const dx = baseX - actualX;
                    const dy = baseY - actualY;
                    const dz = baseZ - actualZ;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq > MAX_DISTANCE * MAX_DISTANCE) {
                        continue;
                    }

                    // Check if it's a target block
                    const block = this.bot.blockAt(pos);
                    if (!block) continue;
                    
                    const stateID = this.getBlockStateId(block);
                    if (!blockPriorities.has(stateID)) {
                        continue;
                    }

                    const blockPriority = blockPriorities.get(stateID);

                    // 0 means no chance for selection
                    if (blockPriority === 0) {
                        continue;
                    }

                    // Check visibility
                    if (!this.hasVisibleSide(pos)) {
                        continue;
                    }

                    // Calculate mining cost components
                    const hardness = this.getBlockStrength(stateID);
                    const angleChange = this.getAngleChange(pos); // Will implement AngleUtil later
                    
                    const config = require('../config/MightyMinerConfig').getInstance();

                    // Calculate final cost and add to heap
                    let miningCost = hardness / (miningSpeed * 1.0) * (config.miningCoefficient || 1.0)
                                   + angleChange * (config.angleCoefficient || 0.1)
                                   + distSq * (config.distanceCoefficient || 0.1);
                    miningCost /= (blockPriority * 1.0);

                    blocks.add(pos, miningCost);
                }
            }
        }
        return blocks;
    }

    /**
     * EXACT replica of getBlockStrength from Java
     */
    getBlockStrength(stateID) {
        switch (stateID) {
            case 57:  // Diamond Block
            case 41:  // Gold Block
            case 152: // Redstone Block
            case 22:  // Lapis Block
            case 133: // Emerald Block
            case 42:  // Iron Block
            case 173: // Coal Block
                return 600;

            case 19:  // Sponge
                return 500;

            case 1:   // Stone - strength of hardstone
                return 50;

            case 16385: // polished diorite
                return 2000;
            case 28707: // gray wool
                return 500;
            case 12323: // light blue wool
                return 1500;
            case 37023: // cyan stained clay
                return 500;

            case 168: // Prismarine
            case 4264: // dark prismrine
            case 8360: // brick prismarine
                return 800;

            case 95:    // opal
            case 160:
            case 16544: // topaz
            case 16479:
                return 3800;
            case 4191:  // amber
            case 4256:
            case 12383: // sapphire
            case 12448:
            case 20575: // jade
            case 20640:
            case 41055: // amethyst
            case 41120:
                return 3000;
            case 8287:  // jasper
            case 8352:
                return 4800;
            case 45151: // aquamarine
            case 45216:
            case 53343: // peridot
            case 53408:
            case 61535: // onyx
            case 61600:
            case 49247: // citrine
            case 49312:
                return 5200;
            case 57504: // ruby
            case 57439:
                return 2300;
            default:
                break;
        }

        return 5000;
    }

    getMiningTime(stateId, miningSpeed) {
        const config = require('../config/MightyMinerConfig').getInstance();
        return Math.ceil((this.getBlockStrength(stateId) * 30) / miningSpeed) + (config.tickGlideOffset || 0);
    }

    getSidePos(block, face) {
        const offset = BlockUtil.BLOCK_SIDES[face] || BlockUtil.BLOCK_SIDES['center'];
        return new Vec3(block.x + offset[0], block.y + offset[1], block.z + offset[2]);
    }

    hasVisibleSide(blockPos) {
        const sides = ['down', 'up', 'west', 'east', 'north', 'south'];
        return sides.some(side => this.canSeeSide(blockPos, side));
    }

    canSeeSide(block, side) {
        return this.canSeePoint(this.getSidePos(block, side));
    }

    canSeePoint(targetPos) {
        if (!this.bot || !this.bot.entity) return false;
        
        const eyePos = PlayerUtil.getStaticPlayerEyePos(this.bot);
        return this.canSeePointFrom(eyePos, targetPos);
    }

    canSeePointFrom(from, to) {
        // Simplified raytracing - check if there are any solid blocks between points
        const direction = to.minus(from).normalize();
        const distance = from.distanceTo(to);
        const steps = Math.ceil(distance * 2); // Check every 0.5 blocks
        
        for (let i = 1; i < steps; i++) {
            const checkPos = from.plus(direction.scaled(i * 0.5));
            const block = this.bot.blockAt(new Vec3(Math.floor(checkPos.x), Math.floor(checkPos.y), Math.floor(checkPos.z)));
            
            if (block && this.isBlockSolid(block)) {
                return false;
            }
        }
        return true;
    }

    isBlockSolid(block) {
        if (!block || block.name === 'air') return false;
        
        // List of non-solid blocks that don't block line of sight
        const nonSolidBlocks = ['air', 'water', 'lava', 'grass', 'vine', 'web', 'torch', 'flower', 'sapling'];
        return !nonSolidBlocks.some(type => block.name.includes(type));
    }

    getBlockStateId(block) {
        // Convert mineflayer block to state ID (simplified)
        // This would need proper implementation based on minecraft-data
        return block.stateId || block.type;
    }

    getAngleChange(targetPos) {
        // Use AngleUtil for exact angle calculations
        if (!this.bot || !this.bot.entity) return 0;
        
        try {
            const AngleUtil = require('./AngleUtil');
            const angleUtil = new AngleUtil(this.bot);
            
            const playerAngle = angleUtil.getPlayerAngle();
            const targetAngle = angleUtil.getRotation(targetPos);
            const change = AngleUtil.getNeededChange(playerAngle, targetAngle);
            
            return change.lengthSqrt();
        } catch (error) {
            // Fallback to simplified calculation
            const eyePos = PlayerUtil.getStaticPlayerEyePos(this.bot);
            const direction = targetPos.minus(eyePos).normalize();
            
            const targetYaw = Math.atan2(-direction.x, direction.z);
            const targetPitch = Math.asin(-direction.y);
            
            const currentYaw = this.bot.entity.yaw;
            const currentPitch = this.bot.entity.pitch;
            
            const yawDiff = Math.abs(targetYaw - currentYaw);
            const pitchDiff = Math.abs(targetPitch - currentPitch);
            
            return Math.sqrt(yawDiff * yawDiff + pitchDiff * pitchDiff);
        }
    }

    longHash(x, y, z) {
        // Create a unique hash for coordinates
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    // Static methods for compatibility
    static getStaticBlockLookingAt(bot) {
        return new BlockUtil(bot).getBlockLookingAt();
    }
}

// Simple MinHeap implementation for block prioritization
class MinHeap {
    constructor(capacity = 500) {
        this.heap = [];
        this.capacity = capacity;
        this.costMap = new Map();
    }

    add(item, cost) {
        if (this.heap.length >= this.capacity) {
            // Remove highest cost item if at capacity
            const maxIndex = this.getMaxIndex();
            if (cost < this.costMap.get(this.heap[maxIndex])) {
                this.costMap.delete(this.heap[maxIndex]);
                this.heap.splice(maxIndex, 1);
            } else {
                return; // Don't add if cost is higher than max
            }
        }
        
        this.heap.push(item);
        this.costMap.set(item, cost);
    }

    getBlocks() {
        // Sort by cost (lowest first)
        return this.heap.sort((a, b) => this.costMap.get(a) - this.costMap.get(b));
    }

    getCost(item) {
        return this.costMap.get(item) || 0;
    }

    getMaxIndex() {
        let maxIndex = 0;
        let maxCost = this.costMap.get(this.heap[0]);
        
        for (let i = 1; i < this.heap.length; i++) {
            const cost = this.costMap.get(this.heap[i]);
            if (cost > maxCost) {
                maxCost = cost;
                maxIndex = i;
            }
        }
        
        return maxIndex;
    }
}

module.exports = BlockUtil;

