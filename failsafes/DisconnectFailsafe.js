const AbstractFailsafe = require('./AbstractFailsafe');

/**
 * Detects when the bot gets disconnected from server
 * 1:1 replica of DisconnectFailsafe.java
 */
class DisconnectFailsafe extends AbstractFailsafe {
    constructor() {
        super('Disconnect', 9); // High priority
        this.lastPingTime = Date.now();
        this.maxPingInterval = 30000; // 30 seconds without ping = disconnect
        this.disconnectReasons = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    /**
     * Check if bot is disconnected
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        if (!bot._client || !bot._client.socket) {
            return true; // No client or socket
        }
        
        // Check if socket is connected
        if (bot._client.socket.readyState !== 1) {
            return true; // Socket not in OPEN state
        }
        
        // Check for ping timeout
        const now = Date.now();
        if (now - this.lastPingTime > this.maxPingInterval) {
            return true; // Ping timeout
        }
        
        return false;
    }

    /**
     * Handle disconnect event
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        const reason = this.getDisconnectReason(bot);
        this.disconnectReasons.push({
            reason,
            timestamp: Date.now()
        });
        
        this.logger.error(`Disconnect detected: ${reason}`);
        
        // Emit disconnect event
        if (bot.emit) {
            bot.emit('disconnect_detected', {
                reason,
                timestamp: Date.now(),
                reconnectAttempts: this.reconnectAttempts
            });
        }
        
        // Attempt reconnection if configured
        if (this.shouldAttemptReconnect()) {
            this.reconnectAttempts++;
            this.logger.info(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            // Emit reconnect request
            if (bot.emit) {
                bot.emit('reconnect_requested', {
                    attempt: this.reconnectAttempts,
                    maxAttempts: this.maxReconnectAttempts
                });
            }
            
            return false; // Don't stop macro, try to reconnect
        }
        
        return true; // Stop macro
    }

    /**
     * Get the reason for disconnection
     * @param {Object} bot
     * @returns {string}
     */
    getDisconnectReason(bot) {
        if (!bot._client || !bot._client.socket) {
            return 'No client or socket';
        }
        
        const socket = bot._client.socket;
        
        if (socket.readyState === 3) {
            return 'Socket closed';
        } else if (socket.readyState === 2) {
            return 'Socket closing';
        } else if (Date.now() - this.lastPingTime > this.maxPingInterval) {
            return 'Ping timeout';
        }
        
        return 'Unknown disconnect reason';
    }

    /**
     * Check if should attempt reconnection
     * @returns {boolean}
     */
    shouldAttemptReconnect() {
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }

    /**
     * Update ping time (call this when receiving packets)
     */
    updatePingTime() {
        this.lastPingTime = Date.now();
    }

    /**
     * Set max reconnect attempts
     * @param {number} attempts
     */
    setMaxReconnectAttempts(attempts) {
        this.maxReconnectAttempts = attempts;
        this.logger.info(`Max reconnect attempts set to ${attempts}`);
    }

    /**
     * Set ping timeout interval
     * @param {number} interval
     */
    setPingTimeout(interval) {
        this.maxPingInterval = interval;
        this.logger.info(`Ping timeout set to ${interval}ms`);
    }

    /**
     * Get disconnect statistics
     * @returns {Object}
     */
    getDisconnectStats() {
        return {
            lastPingTime: this.lastPingTime,
            maxPingInterval: this.maxPingInterval,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            recentDisconnects: this.disconnectReasons.slice(-5)
        };
    }

    /**
     * Reset reconnect attempts
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
        this.logger.info('Reconnect attempts reset');
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.lastPingTime = Date.now();
        this.reconnectAttempts = 0;
        this.disconnectReasons.length = 0;
    }
}

module.exports = DisconnectFailsafe;

