const AbstractFailsafe = require('./AbstractFailsafe');
const MightyMinerConfig = require('../config/MightyMinerConfig');

/**
 * Detects nearby players and stops macro to avoid detection
 * 1:1 replica of PlayerFailsafe.java
 */
class PlayerFailsafe extends AbstractFailsafe {
    constructor() {
        super('Player', 10); // High priority
        this.detectionRadius = 20; // blocks
        this.ignoredPlayers = new Set();
        this.lastPlayerCount = 0;
        this.playerHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * Check if any players are nearby
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        if (!bot.players) return false;
        
        const nearbyPlayers = this.getNearbyPlayers(bot);
        const filteredPlayers = nearbyPlayers.filter(player => 
            !this.ignoredPlayers.has(player.username) && 
            player.username !== bot.username
        );
        
        // Update player history
        this.updatePlayerHistory(filteredPlayers.length);
        
        // Trigger if any players detected
        return filteredPlayers.length > 0;
    }

    /**
     * Stop macro when players detected
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        const nearbyPlayers = this.getNearbyPlayers(bot);
        const playerNames = nearbyPlayers
            .filter(p => !this.ignoredPlayers.has(p.username) && p.username !== bot.username)
            .map(p => p.username);
        
        this.logger.warn(`Players detected nearby: ${playerNames.join(', ')}`);
        
        // Send notification if configured
        if (MightyMinerConfig.notifications?.playerDetection) {
            bot.emit('player_detected', {
                players: playerNames,
                count: playerNames.length,
                timestamp: Date.now()
            });
        }
        
        return true; // Stop macro
    }

    /**
     * Get all nearby players within detection radius
     * @param {Object} bot
     * @returns {Array}
     */
    getNearbyPlayers(bot) {
        if (!bot.players || !bot.entity) return [];
        
        const players = [];
        const botPos = bot.entity.position;
        
        for (const [username, player] of Object.entries(bot.players)) {
            if (!player.entity || username === bot.username) continue;
            
            const distance = botPos.distanceTo(player.entity.position);
            if (distance <= this.detectionRadius) {
                players.push({
                    username,
                    distance,
                    position: player.entity.position,
                    entity: player.entity
                });
            }
        }
        
        return players.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Update player count history
     * @param {number} count
     */
    updatePlayerHistory(count) {
        this.playerHistory.push({
            count,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.playerHistory.length > this.maxHistorySize) {
            this.playerHistory.shift();
        }
        
        this.lastPlayerCount = count;
    }

    /**
     * Add player to ignore list
     * @param {string} username
     */
    ignorePlayer(username) {
        this.ignoredPlayers.add(username);
        this.logger.info(`Added ${username} to ignore list`);
    }

    /**
     * Remove player from ignore list
     * @param {string} username
     */
    unignorePlayer(username) {
        this.ignoredPlayers.delete(username);
        this.logger.info(`Removed ${username} from ignore list`);
    }

    /**
     * Set detection radius
     * @param {number} radius
     */
    setDetectionRadius(radius) {
        this.detectionRadius = radius;
        this.logger.info(`Detection radius set to ${radius} blocks`);
    }

    /**
     * Get player statistics
     * @returns {Object}
     */
    getPlayerStats() {
        return {
            lastPlayerCount: this.lastPlayerCount,
            detectionRadius: this.detectionRadius,
            ignoredPlayers: Array.from(this.ignoredPlayers),
            history: this.playerHistory.slice(-5) // Last 5 entries
        };
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.playerHistory.length = 0;
        this.lastPlayerCount = 0;
    }
}

module.exports = PlayerFailsafe;

