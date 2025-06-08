/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.failsafe.impl.BedrockCheckFailsafe
 * Detects if player is unexpectedly near bedrock (indicating teleportation to void)
 */
const AbstractFailsafe = require('./AbstractFailsafe');
const Logger = require('../src/util/Logger');
const PlayerUtil = require('../src/util/PlayerUtil');

class BedrockCheckFailsafe extends AbstractFailsafe {
    constructor() {
        super('BedrockCheckFailsafe', 3000); // 3 second timeout
        this.dangerousYLevel = 10; // Y level considered dangerous
        this.bedrockNearbyRadius = 3;
        this.consecutiveChecks = 0;
        this.maxConsecutiveChecks = 5; // Trigger after 5 consecutive dangerous checks
        this.lastDangerousPosition = null;
        this.checkInterval = 1000; // Check every second
        this.lastCheckTime = 0;
    }
    
    // EXACT replica of check from Java
    check(bot) {
        if (!this.enabled || !bot || !bot.entity) {
            return false;
        }
        
        try {
            const now = Date.now();
            if (now - this.lastCheckTime < this.checkInterval) {
                return false;
            }
            
            const playerPos = bot.entity.position;
            const isDangerous = this.checkDangerousPosition(bot, playerPos);
            
            if (isDangerous) {
                this.consecutiveChecks++;
                this.lastDangerousPosition = { ...playerPos };
                
                Logger.sendWarning(`Dangerous position detected: Y=${playerPos.y.toFixed(1)} (${this.consecutiveChecks}/${this.maxConsecutiveChecks})`);
                
                if (this.consecutiveChecks >= this.maxConsecutiveChecks) {
                    this.triggered = true;
                    this.triggerTime = now;
                    this.reason = `Player at dangerous Y level ${playerPos.y.toFixed(1)} with bedrock nearby`;
                    Logger.sendError(this.reason);
                    return true;
                }
            } else {
                // Reset consecutive checks if position is safe
                if (this.consecutiveChecks > 0) {
                    Logger.sendDebug('Position is safe, resetting consecutive checks');
                    this.consecutiveChecks = 0;
                    this.lastDangerousPosition = null;
                }
            }
            
            this.lastCheckTime = now;
            return false;
        } catch (error) {
            Logger.sendWarning(`BedrockCheckFailsafe error: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of checkDangerousPosition from Java
    checkDangerousPosition(bot, position) {
        // Check if Y level is dangerously low
        if (position.y > this.dangerousYLevel) {
            return false;
        }
        
        // Check for bedrock nearby
        const bedrockNearby = this.isBedrockNearby(bot, position);
        
        // Check if player is in void (no blocks below)
        const voidBelow = this.isVoidBelow(bot, position);
        
        // Check if player velocity indicates falling
        const isFalling = this.isFallingFast(bot);
        
        // Consider dangerous if any of these conditions are met
        return bedrockNearby || voidBelow || (position.y <= 5 && isFalling);
    }
    
    // EXACT replica of isBedrockNearby from Java
    isBedrockNearby(bot, position) {
        try {
            for (let x = -this.bedrockNearbyRadius; x <= this.bedrockNearbyRadius; x++) {
                for (let y = -this.bedrockNearbyRadius; y <= this.bedrockNearbyRadius; y++) {
                    for (let z = -this.bedrockNearbyRadius; z <= this.bedrockNearbyRadius; z++) {
                        const checkPos = {
                            x: Math.floor(position.x + x),
                            y: Math.floor(position.y + y),
                            z: Math.floor(position.z + z)
                        };
                        
                        const block = bot.blockAt(checkPos);
                        if (block && this.isBedrockBlock(block)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } catch (error) {
            Logger.sendDebug(`Error checking bedrock nearby: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of isVoidBelow from Java
    isVoidBelow(bot, position) {
        try {
            // Check multiple blocks below player
            for (let y = 1; y <= 5; y++) {
                const checkPos = {
                    x: Math.floor(position.x),
                    y: Math.floor(position.y - y),
                    z: Math.floor(position.z)
                };
                
                const block = bot.blockAt(checkPos);
                if (block && block.name !== 'air' && block.name !== 'void_air') {
                    return false; // Found solid block below
                }
            }
            
            // If we're below Y=10 and no blocks found below, consider it void
            return position.y < this.dangerousYLevel;
        } catch (error) {
            Logger.sendDebug(`Error checking void below: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of isFallingFast from Java
    isFallingFast(bot) {
        try {
            const velocity = bot.entity.velocity;
            if (!velocity) return false;
            
            // Check if falling faster than normal fall speed
            const fallThreshold = -0.5; // Blocks per tick
            return velocity.y < fallThreshold;
        } catch (error) {
            Logger.sendDebug(`Error checking fall velocity: ${error.message}`);
            return false;
        }
    }
    
    // EXACT replica of isBedrockBlock from Java
    isBedrockBlock(block) {
        if (!block || !block.name) return false;
        
        const blockName = block.name.toLowerCase();
        
        return blockName === 'bedrock' ||
               blockName === 'barrier' ||
               blockName === 'command_block' ||
               blockName === 'structure_block';
    }
    
    // EXACT replica of reset from Java
    reset() {
        super.reset();
        this.consecutiveChecks = 0;
        this.lastDangerousPosition = null;
        this.lastCheckTime = 0;
        Logger.sendLog('BedrockCheckFailsafe reset');
    }
    
    // EXACT replica of getDebugInfo from Java
    getDebugInfo() {
        return {
            ...super.getDebugInfo(),
            consecutiveChecks: this.consecutiveChecks,
            maxConsecutiveChecks: this.maxConsecutiveChecks,
            dangerousYLevel: this.dangerousYLevel,
            lastDangerousPosition: this.lastDangerousPosition,
            checkInterval: this.checkInterval
        };
    }
    
    // Configuration methods
    setDangerousYLevel(level) {
        if (typeof level === 'number' && level >= 0 && level <= 256) {
            this.dangerousYLevel = level;
            Logger.sendDebug(`Set dangerous Y level to ${level}`);
        }
    }
    
    setBedrockRadius(radius) {
        if (typeof radius === 'number' && radius > 0 && radius <= 10) {
            this.bedrockNearbyRadius = radius;
            Logger.sendDebug(`Set bedrock detection radius to ${radius}`);
        }
    }
    
    setMaxConsecutiveChecks(count) {
        if (typeof count === 'number' && count > 0 && count <= 20) {
            this.maxConsecutiveChecks = count;
            Logger.sendDebug(`Set max consecutive checks to ${count}`);
        }
    }
}

module.exports = BedrockCheckFailsafe;

