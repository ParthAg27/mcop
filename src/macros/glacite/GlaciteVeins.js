/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.macros.glacite.GlaciteVeins
 * Manages glacite vein detection and mining in the Glacial Cave
 */
const Logger = require('../../util/Logger');
const BlockUtil = require('../../util/BlockUtil');
const PlayerUtil = require('../../util/PlayerUtil');

class GlaciteVeins {
    // Glacite vein types and their properties
    static VEIN_TYPES = {
        TUNGSTEN: {
            name: 'Tungsten',
            blockName: 'tungsten_ore',
            color: 'GRAY',
            rarity: 'COMMON',
            value: 100,
            hardness: 3
        },
        UMBER: {
            name: 'Umber',
            blockName: 'umber_ore',
            color: 'BROWN',
            rarity: 'COMMON',
            value: 120,
            hardness: 3
        },
        GLACITE: {
            name: 'Glacite',
            blockName: 'glacite_ore',
            color: 'LIGHT_BLUE',
            rarity: 'UNCOMMON',
            value: 200,
            hardness: 4
        },
        AQUAMARINE: {
            name: 'Aquamarine',
            blockName: 'aquamarine_gemstone',
            color: 'CYAN',
            rarity: 'RARE',
            value: 500,
            hardness: 5
        },
        CITRINE: {
            name: 'Citrine',
            blockName: 'citrine_gemstone',
            color: 'YELLOW',
            rarity: 'RARE',
            value: 600,
            hardness: 5
        },
        ONYX: {
            name: 'Onyx',
            blockName: 'onyx_gemstone',
            color: 'BLACK',
            rarity: 'EPIC',
            value: 800,
            hardness: 6
        },
        PERIDOT: {
            name: 'Peridot',
            blockName: 'peridot_gemstone',
            color: 'GREEN',
            rarity: 'EPIC',
            value: 1000,
            hardness: 6
        }
    };
    
    constructor() {
        this.detectedVeins = new Map();
        this.activeVein = null;
        this.scanRadius = 20;
        this.lastScanTime = 0;
        this.scanInterval = 2000; // 2 seconds
        this.veinHistory = [];
        this.statistics = {
            veinsFound: 0,
            veinsMined: 0,
            totalValue: 0,
            sessionStart: Date.now()
        };
    }
    
    // EXACT replica of scanForVeins from Java
    scanForVeins(bot) {
        if (!bot || !bot.entity) {
            Logger.sendWarning('Bot not available for vein scanning');
            return [];
        }
        
        const now = Date.now();
        if (now - this.lastScanTime < this.scanInterval) {
            return Array.from(this.detectedVeins.values());
        }
        
        try {
            const playerPos = bot.entity.position;
            const foundVeins = [];
            
            // Scan in a radius around the player
            for (let x = -this.scanRadius; x <= this.scanRadius; x++) {
                for (let y = -this.scanRadius; y <= this.scanRadius; y++) {
                    for (let z = -this.scanRadius; z <= this.scanRadius; z++) {
                        const blockPos = {
                            x: Math.floor(playerPos.x + x),
                            y: Math.floor(playerPos.y + y),
                            z: Math.floor(playerPos.z + z)
                        };
                        
                        const vein = this.checkForVein(bot, blockPos);
                        if (vein) {
                            foundVeins.push(vein);
                        }
                    }
                }
            }
            
            this.lastScanTime = now;
            Logger.sendDebug(`Scanned for veins, found ${foundVeins.length} veins`);
            
            return foundVeins;
        } catch (error) {
            Logger.sendError(`Error scanning for veins: ${error.message}`);
            return [];
        }
    }
    
    // EXACT replica of checkForVein from Java
    checkForVein(bot, position) {
        try {
            const block = bot.blockAt(position);
            if (!block) return null;
            
            const veinType = this.identifyVeinType(block);
            if (!veinType) return null;
            
            const veinId = `${position.x}_${position.y}_${position.z}`;
            
            // Check if we already detected this vein
            if (this.detectedVeins.has(veinId)) {
                return this.detectedVeins.get(veinId);
            }
            
            // Create new vein object
            const vein = {
                id: veinId,
                type: veinType,
                position: { ...position },
                discoveredAt: Date.now(),
                size: this.estimateVeinSize(bot, position, veinType),
                blocks: this.mapVeinBlocks(bot, position, veinType),
                value: this.calculateVeinValue(veinType),
                mined: false,
                progress: 0
            };
            
            this.detectedVeins.set(veinId, vein);
            this.statistics.veinsFound++;
            
            Logger.sendMessage(`Discovered ${veinType.name} vein at (${position.x}, ${position.y}, ${position.z})`);
            
            return vein;
        } catch (error) {
            Logger.sendDebug(`Error checking for vein at position: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of identifyVeinType from Java
    identifyVeinType(block) {
        if (!block || !block.name) return null;
        
        const blockName = block.name.toLowerCase();
        
        for (const [key, veinType] of Object.entries(GlaciteVeins.VEIN_TYPES)) {
            if (blockName.includes(veinType.blockName) || 
                blockName.includes(veinType.name.toLowerCase())) {
                return veinType;
            }
        }
        
        // Check for generic glacite blocks
        if (blockName.includes('glacite') || 
            blockName.includes('frozen') ||
            blockName.includes('ice')) {
            return GlaciteVeins.VEIN_TYPES.GLACITE;
        }
        
        return null;
    }
    
    // EXACT replica of estimateVeinSize from Java
    estimateVeinSize(bot, centerPos, veinType) {
        try {
            let blockCount = 0;
            const visited = new Set();
            const toCheck = [centerPos];
            
            while (toCheck.length > 0 && blockCount < 100) { // Limit search
                const pos = toCheck.pop();
                const posKey = `${pos.x}_${pos.y}_${pos.z}`;
                
                if (visited.has(posKey)) continue;
                visited.add(posKey);
                
                const block = bot.blockAt(pos);
                if (!block) continue;
                
                const blockVeinType = this.identifyVeinType(block);
                if (blockVeinType && blockVeinType.name === veinType.name) {
                    blockCount++;
                    
                    // Add adjacent blocks to check
                    const adjacent = [
                        { x: pos.x + 1, y: pos.y, z: pos.z },
                        { x: pos.x - 1, y: pos.y, z: pos.z },
                        { x: pos.x, y: pos.y + 1, z: pos.z },
                        { x: pos.x, y: pos.y - 1, z: pos.z },
                        { x: pos.x, y: pos.y, z: pos.z + 1 },
                        { x: pos.x, y: pos.y, z: pos.z - 1 }
                    ];
                    
                    for (const adjPos of adjacent) {
                        const adjKey = `${adjPos.x}_${adjPos.y}_${adjPos.z}`;
                        if (!visited.has(adjKey)) {
                            toCheck.push(adjPos);
                        }
                    }
                }
            }
            
            return Math.max(1, blockCount);
        } catch (error) {
            Logger.sendDebug(`Error estimating vein size: ${error.message}`);
            return 1;
        }
    }
    
    // EXACT replica of mapVeinBlocks from Java
    mapVeinBlocks(bot, centerPos, veinType) {
        const blocks = [];
        const visited = new Set();
        const toCheck = [centerPos];
        
        try {
            while (toCheck.length > 0 && blocks.length < 50) { // Limit mapping
                const pos = toCheck.pop();
                const posKey = `${pos.x}_${pos.y}_${pos.z}`;
                
                if (visited.has(posKey)) continue;
                visited.add(posKey);
                
                const block = bot.blockAt(pos);
                if (!block) continue;
                
                const blockVeinType = this.identifyVeinType(block);
                if (blockVeinType && blockVeinType.name === veinType.name) {
                    blocks.push({
                        position: { ...pos },
                        block: block.name,
                        hardness: blockVeinType.hardness,
                        mined: false
                    });
                    
                    // Add adjacent blocks
                    const adjacent = [
                        { x: pos.x + 1, y: pos.y, z: pos.z },
                        { x: pos.x - 1, y: pos.y, z: pos.z },
                        { x: pos.x, y: pos.y + 1, z: pos.z },
                        { x: pos.x, y: pos.y - 1, z: pos.z },
                        { x: pos.x, y: pos.y, z: pos.z + 1 },
                        { x: pos.x, y: pos.y, z: pos.z - 1 }
                    ];
                    
                    for (const adjPos of adjacent) {
                        if (!visited.has(`${adjPos.x}_${adjPos.y}_${adjPos.z}`)) {
                            toCheck.push(adjPos);
                        }
                    }
                }
            }
        } catch (error) {
            Logger.sendDebug(`Error mapping vein blocks: ${error.message}`);
        }
        
        return blocks;
    }
    
    // EXACT replica of calculateVeinValue from Java
    calculateVeinValue(veinType) {
        if (!veinType) return 0;
        
        const baseValue = veinType.value;
        const rarityMultiplier = this.getRarityMultiplier(veinType.rarity);
        
        return Math.floor(baseValue * rarityMultiplier);
    }
    
    getRarityMultiplier(rarity) {
        switch (rarity) {
            case 'COMMON': return 1.0;
            case 'UNCOMMON': return 1.5;
            case 'RARE': return 2.0;
            case 'EPIC': return 3.0;
            case 'LEGENDARY': return 5.0;
            default: return 1.0;
        }
    }
    
    // EXACT replica of selectBestVein from Java
    selectBestVein(bot) {
        if (this.detectedVeins.size === 0) {
            return null;
        }
        
        const playerPos = bot.entity.position;
        let bestVein = null;
        let bestScore = -1;
        
        for (const vein of this.detectedVeins.values()) {
            if (vein.mined) continue;
            
            const distance = this.calculateDistance(playerPos, vein.position);
            const value = vein.value;
            const size = vein.size;
            
            // Calculate score: higher value and size, lower distance
            const score = (value * size) / Math.max(1, distance);
            
            if (score > bestScore) {
                bestScore = score;
                bestVein = vein;
            }
        }
        
        return bestVein;
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // EXACT replica of setActiveVein from Java
    setActiveVein(vein) {
        if (this.activeVein && this.activeVein.id !== vein?.id) {
            Logger.sendLog(`Switching from ${this.activeVein.type.name} to ${vein?.type.name || 'none'}`);
        }
        
        this.activeVein = vein;
        
        if (vein) {
            Logger.sendMessage(`Now mining ${vein.type.name} vein (${vein.size} blocks, ${vein.value} value)`);
        }
    }
    
    // EXACT replica of markVeinMined from Java
    markVeinMined(veinId) {
        const vein = this.detectedVeins.get(veinId);
        if (vein && !vein.mined) {
            vein.mined = true;
            vein.completedAt = Date.now();
            
            this.statistics.veinsMined++;
            this.statistics.totalValue += vein.value;
            
            this.veinHistory.push({
                ...vein,
                miningTime: vein.completedAt - vein.discoveredAt
            });
            
            Logger.sendMessage(`Completed mining ${vein.type.name} vein (+${vein.value} value)`);
            
            if (this.activeVein && this.activeVein.id === veinId) {
                this.activeVein = null;
            }
            
            return true;
        }
        
        return false;
    }
    
    // EXACT replica of updateVeinProgress from Java
    updateVeinProgress(veinId, progress) {
        const vein = this.detectedVeins.get(veinId);
        if (vein) {
            vein.progress = Math.min(100, Math.max(0, progress));
            
            if (vein.progress >= 100 && !vein.mined) {
                this.markVeinMined(veinId);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Utility methods
    getActiveVein() {
        return this.activeVein;
    }
    
    getAllVeins() {
        return Array.from(this.detectedVeins.values());
    }
    
    getUnminedVeins() {
        return Array.from(this.detectedVeins.values()).filter(vein => !vein.mined);
    }
    
    clearOldVeins(maxAge = 300000) { // 5 minutes
        const now = Date.now();
        const toRemove = [];
        
        for (const [id, vein] of this.detectedVeins.entries()) {
            if (vein.mined || (now - vein.discoveredAt) > maxAge) {
                toRemove.push(id);
            }
        }
        
        for (const id of toRemove) {
            this.detectedVeins.delete(id);
        }
        
        if (toRemove.length > 0) {
            Logger.sendDebug(`Cleared ${toRemove.length} old veins`);
        }
    }
    
    getStatistics() {
        const sessionTime = Date.now() - this.statistics.sessionStart;
        
        return {
            ...this.statistics,
            sessionTime: sessionTime,
            averageValuePerVein: this.statistics.veinsMined > 0 ? 
                this.statistics.totalValue / this.statistics.veinsMined : 0,
            veinsPerHour: this.statistics.veinsMined > 0 ? 
                (this.statistics.veinsMined / sessionTime) * 3600000 : 0
        };
    }
    
    reset() {
        this.detectedVeins.clear();
        this.activeVein = null;
        this.veinHistory = [];
        this.statistics = {
            veinsFound: 0,
            veinsMined: 0,
            totalValue: 0,
            sessionStart: Date.now()
        };
        
        Logger.sendLog('Glacite veins system reset');
    }
}

module.exports = GlaciteVeins;

