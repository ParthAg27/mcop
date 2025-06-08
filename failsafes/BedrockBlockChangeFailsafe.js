/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.failsafe.impl.BedrockBlockChangeFailsafe
 * Detects bedrock block changes that indicate server-side movement or teleportation
 */
const AbstractFailsafe = require('./AbstractFailsafe');
const Logger = require('../src/util/Logger');
const PlayerUtil = require('../src/util/PlayerUtil');

class BedrockBlockChangeFailsafe extends AbstractFailsafe {
    constructor() {
        super('BedrockBlockChangeFailsafe', 5000); // 5 second timeout
        this.bedrockPositions = new Map();
        this.lastBedrockScan = 0;
        this.scanInterval = 10000; // Scan every 10 seconds
        this.maxBedrockChanges = 3; // Maximum bedrock changes before trigger
        this.bedrockChangeCount = 0;
        this.lastResetTime = Date.now();
        this.resetInterval = 300000; // Reset count every 5 minutes
    }
    
    // EXACT replica of check from Java
    check(bot) {
        if (!this.enabled || !bot || !bot.entity) {
            return false;
        }
        
        try {
            this.resetCountIfNeeded();
            
            const now = Date.now();
            if (now - this.lastBedrockScan < this.scanInterval) {
                return false;
            }
            
            const currentBedrockPositions = this.scanBedrockAround(bot);
            
            if (this.bedrockPositions.size > 0) {
                const changes = this.compareBedrockPositions(currentBedrockPositions);
                
                if (changes > 0) {
                    this.bedrockChangeCount += changes;
                    Logger.sendWarning(`Detected ${changes} bedrock changes (total: ${this.bedrockChangeCount})`);
                    
                    if (this.bedrockChangeCount >= this.maxBedrockChanges) {
                        this.triggered = true;
                        this.triggerTime = now;
                        this.reason = `Detected ${this.bedrockChangeCount} bedrock changes indicating server manipulation`;
                        Logger.sendError(this.reason);
                        return true;
                    }
                }
            }
            
            this.bedrockPositions = currentBedrockPositions;
            this.lastBedrockScan = now;
            
            return false;
        } catch (error) {
            Logger.sendWarning(`BedrockBlockChangeFailsafe error: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of scanBedrockAround from Java
    scanBedrockAround(bot) {
        const bedrockPositions = new Map();
        const playerPos = bot.entity.position;
        const scanRadius = 5; // Small radius for bedrock detection
        
        try {
            for (let x = -scanRadius; x <= scanRadius; x++) {
                for (let y = -scanRadius; y <= scanRadius; y++) {
                    for (let z = -scanRadius; z <= scanRadius; z++) {
                        const blockPos = {
                            x: Math.floor(playerPos.x + x),
                            y: Math.floor(playerPos.y + y),
                            z: Math.floor(playerPos.z + z)
                        };
                        
                        const block = bot.blockAt(blockPos);
                        if (block && this.isBedrockBlock(block)) {
                            const posKey = `${blockPos.x}_${blockPos.y}_${blockPos.z}`;
                            bedrockPositions.set(posKey, {
                                position: blockPos,
                                blockType: block.name,
                                scanTime: Date.now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            Logger.sendDebug(`Error scanning bedrock: ${error.message}`);
        }
        
        return bedrockPositions;
    }
    
    // EXACT replica of isBedrockBlock from Java
    isBedrockBlock(block) {
        if (!block || !block.name) return false;
        
        const blockName = block.name.toLowerCase();
        
        // Check for bedrock and other unbreakable blocks
        return blockName === 'bedrock' ||
               blockName === 'barrier' ||
               blockName === 'command_block' ||
               blockName === 'structure_block' ||
               blockName === 'end_portal_frame' ||
               blockName === 'end_portal';
    }
    
    // EXACT replica of compareBedrockPositions from Java
    compareBedrockPositions(newPositions) {
        let changes = 0;
        
        // Check for removed bedrock blocks
        for (const [posKey, bedrockData] of this.bedrockPositions.entries()) {
            if (!newPositions.has(posKey)) {
                changes++;
                Logger.sendDebug(`Bedrock removed at ${posKey}`);
            }
        }
        
        // Check for new bedrock blocks
        for (const [posKey, bedrockData] of newPositions.entries()) {
            if (!this.bedrockPositions.has(posKey)) {
                changes++;
                Logger.sendDebug(`Bedrock added at ${posKey}`);
            }
        }
        
        return changes;
    }
    
    // EXACT replica of resetCountIfNeeded from Java
    resetCountIfNeeded() {
        const now = Date.now();
        if (now - this.lastResetTime >= this.resetInterval) {
            this.bedrockChangeCount = 0;
            this.lastResetTime = now;
            Logger.sendDebug('Reset bedrock change counter');
        }
    }
    
    // EXACT replica of reset from Java
    reset() {
        super.reset();
        this.bedrockPositions.clear();
        this.bedrockChangeCount = 0;
        this.lastBedrockScan = 0;
        this.lastResetTime = Date.now();
        Logger.sendLog('BedrockBlockChangeFailsafe reset');
    }
    
    // EXACT replica of getDebugInfo from Java
    getDebugInfo() {
        return {
            ...super.getDebugInfo(),
            bedrockPositionsCount: this.bedrockPositions.size,
            bedrockChangeCount: this.bedrockChangeCount,
            lastBedrockScan: this.lastBedrockScan,
            scanInterval: this.scanInterval,
            maxBedrockChanges: this.maxBedrockChanges
        };
    }
}

module.exports = BedrockBlockChangeFailsafe;

