const AbstractFailsafe = require('./AbstractFailsafe');

/**
 * Detects when player gets knocked back (by mobs or other players)
 * 1:1 replica of KnockbackFailsafe.java
 */
class KnockbackFailsafe extends AbstractFailsafe {
    constructor() {
        super('Knockback', 7); // High priority
        this.lastPosition = null;
        this.lastVelocity = null;
        this.knockbackThreshold = 3.0; // blocks per second
        this.consecutiveKnockbacks = 0;
        this.maxKnockbacks = 3;
        this.knockbackHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * Check for knockback events
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        if (!bot.entity) return false;
        
        const currentPos = bot.entity.position;
        const currentVelocity = bot.entity.velocity;
        
        // Detect sudden position change (knockback)
        const knockbackDetected = this.detectKnockback(currentPos, currentVelocity);
        
        if (knockbackDetected) {
            this.consecutiveKnockbacks++;
            this.addToHistory('Knockback detected', currentPos, currentVelocity);
            
            // Trigger if too many consecutive knockbacks
            if (this.consecutiveKnockbacks >= this.maxKnockbacks) {
                return true;
            }
        } else {
            // Reset counter if no knockback detected
            if (this.consecutiveKnockbacks > 0) {
                this.consecutiveKnockbacks = Math.max(0, this.consecutiveKnockbacks - 1);
            }
        }
        
        // Update tracking variables
        this.lastPosition = currentPos.clone();
        this.lastVelocity = currentVelocity ? {
            x: currentVelocity.x,
            y: currentVelocity.y,
            z: currentVelocity.z
        } : null;
        
        return false;
    }

    /**
     * Handle knockback detection
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        this.logger.warn(`Knockback failsafe triggered - ${this.consecutiveKnockbacks} consecutive knockbacks detected`);
        
        // Check for potential threats
        const threats = this.findNearbyThreats(bot);
        if (threats.length > 0) {
            this.logger.warn(`Found ${threats.length} nearby threats: ${threats.map(t => t.type || t.mobType).join(', ')}`);
        }
        
        // Emit knockback event
        if (bot.emit) {
            bot.emit('knockback_detected', {
                consecutiveKnockbacks: this.consecutiveKnockbacks,
                threats: threats.length,
                position: bot.entity.position,
                velocity: bot.entity.velocity,
                timestamp: Date.now()
            });
        }
        
        // Try to escape the situation
        await this.attemptEscape(bot);
        
        return true; // Stop macro for safety
    }

    /**
     * Detect if knockback occurred
     * @param {Object} currentPos
     * @param {Object} currentVelocity
     * @returns {boolean}
     */
    detectKnockback(currentPos, currentVelocity) {
        if (!this.lastPosition || !currentVelocity) return false;
        
        // Calculate velocity magnitude
        const velocityMagnitude = Math.sqrt(
            currentVelocity.x ** 2 + 
            currentVelocity.y ** 2 + 
            currentVelocity.z ** 2
        );
        
        // Check for sudden high velocity (indicates knockback)
        if (velocityMagnitude > this.knockbackThreshold) {
            return true;
        }
        
        // Check for sudden position change
        const positionDelta = currentPos.distanceTo(this.lastPosition);
        const timeDelta = 0.05; // Assume 20 TPS
        const speed = positionDelta / timeDelta;
        
        if (speed > this.knockbackThreshold * 2) {
            return true;
        }
        
        return false;
    }

    /**
     * Find nearby threats (mobs, players)
     * @param {Object} bot
     * @returns {Array}
     */
    findNearbyThreats(bot) {
        if (!bot.entities) return [];
        
        const threats = [];
        const playerPos = bot.entity.position;
        const threatRadius = 10; // blocks
        
        for (const [id, entity] of Object.entries(bot.entities)) {
            if (entity.id === bot.entity.id) continue; // Skip self
            
            const distance = playerPos.distanceTo(entity.position);
            if (distance <= threatRadius) {
                // Check if entity is a threat
                if (this.isThreat(entity)) {
                    threats.push({
                        ...entity,
                        distance
                    });
                }
            }
        }
        
        // Sort by distance (closest first)
        threats.sort((a, b) => a.distance - b.distance);
        return threats;
    }

    /**
     * Check if entity is a threat
     * @param {Object} entity
     * @returns {boolean}
     */
    isThreat(entity) {
        // Hostile mobs
        if (entity.type === 'mob') {
            const hostileMobs = [
                'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
                'blaze', 'ghast', 'witch', 'slime', 'magma_cube'
            ];
            
            const mobType = (entity.mobType || '').toLowerCase();
            return hostileMobs.some(hostile => mobType.includes(hostile));
        }
        
        // Other players (potential PvP)
        if (entity.type === 'player' && entity.username) {
            return true;
        }
        
        return false;
    }

    /**
     * Attempt to escape from threats
     * @param {Object} bot
     */
    async attemptEscape(bot) {
        this.logger.info('Attempting to escape from threats...');
        
        // Jump and move away from threats
        bot.setControlState('jump', true);
        
        // Find escape direction (away from threats)
        const threats = this.findNearbyThreats(bot);
        if (threats.length > 0) {
            const playerPos = bot.entity.position;
            const closestThreat = threats[0];
            
            // Calculate escape direction (opposite of threat)
            const escapeDirection = {
                x: playerPos.x - closestThreat.position.x,
                z: playerPos.z - closestThreat.position.z
            };
            
            // Normalize direction
            const magnitude = Math.sqrt(escapeDirection.x ** 2 + escapeDirection.z ** 2);
            if (magnitude > 0) {
                escapeDirection.x /= magnitude;
                escapeDirection.z /= magnitude;
            }
            
            // Move in escape direction
            bot.setControlState('forward', escapeDirection.x > 0.5);
            bot.setControlState('back', escapeDirection.x < -0.5);
            bot.setControlState('left', escapeDirection.z < -0.5);
            bot.setControlState('right', escapeDirection.z > 0.5);
        } else {
            // No specific threat direction, just move randomly
            const directions = ['forward', 'back', 'left', 'right'];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            bot.setControlState(randomDir, true);
        }
        
        // Maintain escape movement for a short time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Clear all controls
        bot.clearControlStates();
    }

    /**
     * Add entry to knockback history
     * @param {string} event
     * @param {Object} position
     * @param {Object} velocity
     */
    addToHistory(event, position, velocity) {
        this.knockbackHistory.push({
            event,
            position: position.clone(),
            velocity: velocity ? { ...velocity } : null,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.knockbackHistory.length > this.maxHistorySize) {
            this.knockbackHistory.shift();
        }
    }

    /**
     * Get knockback statistics
     * @returns {Object}
     */
    getKnockbackStats() {
        return {
            consecutiveKnockbacks: this.consecutiveKnockbacks,
            maxKnockbacks: this.maxKnockbacks,
            knockbackThreshold: this.knockbackThreshold,
            recentHistory: this.knockbackHistory.slice(-5)
        };
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.lastPosition = null;
        this.lastVelocity = null;
        this.consecutiveKnockbacks = 0;
        this.knockbackHistory.length = 0;
    }
}

module.exports = KnockbackFailsafe;

