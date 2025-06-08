const AbstractFailsafe = require('./AbstractFailsafe');

/**
 * Detects when player hits bedrock or gets stuck in bedrock
 * 1:1 replica of BedrockFailsafe.java
 */
class BedrockFailsafe extends AbstractFailsafe {
    constructor() {
        super('Bedrock', 8); // High priority
        this.bedrockPositions = new Set();
        this.lastPosition = null;
        this.stuckTime = 0;
        this.maxStuckTime = 15000; // 15 seconds
        this.bedrockCheckRadius = 2;
    }

    /**
     * Check if player is stuck in/near bedrock
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        if (!bot.entity) return false;
        
        const currentPos = bot.entity.position;
        
        // Check if surrounded by bedrock
        if (this.isSurroundedByBedrock(bot, currentPos)) {
            return true;
        }
        
        // Check if stuck in same position near bedrock
        if (this.isStuckNearBedrock(bot, currentPos)) {
            return true;
        }
        
        return false;
    }

    /**
     * Handle bedrock detection
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        this.logger.warn('Bedrock failsafe triggered - player stuck in/near bedrock');
        
        // Try to escape bedrock
        await this.attemptBedrockEscape(bot);
        
        // Emit bedrock event
        if (bot.emit) {
            bot.emit('bedrock_detected', {
                position: bot.entity.position,
                timestamp: Date.now()
            });
        }
        
        return true; // Stop macro
    }

    /**
     * Check if player is surrounded by bedrock
     * @param {Object} bot
     * @param {Object} position
     * @returns {boolean}
     */
    isSurroundedByBedrock(bot, position) {
        const directions = [
            { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
        ];
        
        let bedrockCount = 0;
        
        for (const dir of directions) {
            const checkPos = {
                x: Math.floor(position.x) + dir.x,
                y: Math.floor(position.y) + dir.y,
                z: Math.floor(position.z) + dir.z
            };
            
            const block = bot.blockAt(checkPos);
            if (block && block.name === 'bedrock') {
                bedrockCount++;
            }
        }
        
        // If more than 4 directions have bedrock, player is likely stuck
        return bedrockCount >= 4;
    }

    /**
     * Check if player is stuck in same position near bedrock
     * @param {Object} bot
     * @param {Object} currentPos
     * @returns {boolean}
     */
    isStuckNearBedrock(bot, currentPos) {
        const now = Date.now();
        
        if (this.lastPosition) {
            const distance = currentPos.distanceTo(this.lastPosition);
            
            // If player hasn't moved much
            if (distance < 0.5) {
                if (this.stuckTime === 0) {
                    this.stuckTime = now;
                }
                
                // Check if stuck for too long near bedrock
                if (now - this.stuckTime > this.maxStuckTime) {
                    return this.isNearBedrock(bot, currentPos);
                }
            } else {
                this.stuckTime = 0;
            }
        }
        
        this.lastPosition = currentPos.clone();
        return false;
    }

    /**
     * Check if position is near bedrock
     * @param {Object} bot
     * @param {Object} position
     * @returns {boolean}
     */
    isNearBedrock(bot, position) {
        for (let x = -this.bedrockCheckRadius; x <= this.bedrockCheckRadius; x++) {
            for (let y = -this.bedrockCheckRadius; y <= this.bedrockCheckRadius; y++) {
                for (let z = -this.bedrockCheckRadius; z <= this.bedrockCheckRadius; z++) {
                    const checkPos = {
                        x: Math.floor(position.x) + x,
                        y: Math.floor(position.y) + y,
                        z: Math.floor(position.z) + z
                    };
                    
                    const block = bot.blockAt(checkPos);
                    if (block && block.name === 'bedrock') {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Attempt to escape from bedrock
     * @param {Object} bot
     */
    async attemptBedrockEscape(bot) {
        this.logger.info('Attempting to escape bedrock...');
        
        // Try jumping repeatedly
        for (let i = 0; i < 5; i++) {
            bot.setControlState('jump', true);
            await new Promise(resolve => setTimeout(resolve, 500));
            bot.setControlState('jump', false);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Try moving in different directions
        const directions = ['forward', 'back', 'left', 'right'];
        
        for (const direction of directions) {
            bot.setControlState(direction, true);
            bot.setControlState('jump', true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            bot.clearControlStates();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Clear all controls
        bot.clearControlStates();
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.bedrockPositions.clear();
        this.lastPosition = null;
        this.stuckTime = 0;
    }
}

module.exports = BedrockFailsafe;

