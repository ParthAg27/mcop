const AbstractFeature = require('./AbstractFeature');
const Logger = require('../Logger');

/**
 * Detects lag and connection issues
 * 1:1 replica of LagDetector.java
 */
class LagDetector extends AbstractFeature {
    constructor() {
        super('LagDetector');
        this.logger = new Logger('LagDetector');
        
        // Lag detection parameters
        this.lagThreshold = 500; // milliseconds
        this.severeLagThreshold = 2000; // milliseconds
        this.pingHistory = [];
        this.maxPingHistory = 20;
        
        // Timing tracking
        this.lastTickTime = Date.now();
        this.lastPingTime = 0;
        this.tickTimes = [];
        this.maxTickHistory = 50;
        
        // Lag statistics
        this.lagEvents = [];
        this.maxLagEvents = 100;
        this.currentLagLevel = 'NONE';
        this.lagStartTime = 0;
        
        // TPS tracking
        this.tpsHistory = [];
        this.maxTpsHistory = 20;
        this.lastTpsCalculation = 0;
        this.tpsCalculationInterval = 1000; // 1 second
        
        // Connection tracking
        this.lastPacketTime = Date.now();
        this.packetTimeouts = 0;
        this.maxPacketTimeout = 10000; // 10 seconds
    }

    /**
     * Enable lag detector
     */
    onEnable() {
        this.logger.info('LagDetector enabled');
        this.resetStats();
    }

    /**
     * Disable lag detector
     */
    onDisable() {
        this.logger.info('LagDetector disabled');
    }

    /**
     * Main lag detection logic
     */
    async onTick() {
        if (!this.enabled || !this.bot) return;
        
        const now = Date.now();
        
        try {
            // Track tick timing
            this.trackTickTiming(now);
            
            // Calculate TPS
            this.calculateTPS(now);
            
            // Check for lag
            this.detectLag(now);
            
            // Check connection status
            this.checkConnection(now);
            
            // Update ping if available
            this.updatePing();
            
        } catch (error) {
            this.logger.error('Error in LagDetector tick:', error);
        }
    }

    /**
     * Track tick timing for lag detection
     * @param {number} now
     */
    trackTickTiming(now) {
        const tickDelta = now - this.lastTickTime;
        this.tickTimes.push(tickDelta);
        
        // Keep only recent tick times
        if (this.tickTimes.length > this.maxTickHistory) {
            this.tickTimes.shift();
        }
        
        this.lastTickTime = now;
    }

    /**
     * Calculate server TPS (Ticks Per Second)
     * @param {number} now
     */
    calculateTPS(now) {
        if (now - this.lastTpsCalculation < this.tpsCalculationInterval) {
            return;
        }
        
        this.lastTpsCalculation = now;
        
        if (this.tickTimes.length < 10) return; // Need enough data
        
        // Calculate average tick time over last 10 ticks
        const recentTicks = this.tickTimes.slice(-10);
        const averageTickTime = recentTicks.reduce((sum, time) => sum + time, 0) / recentTicks.length;
        
        // Convert to TPS (expected: 50ms per tick = 20 TPS)
        const expectedTickTime = 50; // milliseconds
        const tps = Math.min(20, (expectedTickTime / averageTickTime) * 20);
        
        this.tpsHistory.push({
            tps: Math.round(tps * 10) / 10,
            timestamp: now,
            averageTickTime
        });
        
        // Keep only recent TPS data
        if (this.tpsHistory.length > this.maxTpsHistory) {
            this.tpsHistory.shift();
        }
    }

    /**
     * Detect lag based on various metrics
     * @param {number} now
     */
    detectLag(now) {
        const lagLevel = this.calculateLagLevel();
        
        if (lagLevel !== this.currentLagLevel) {
            this.handleLagLevelChange(lagLevel, now);
        }
    }

    /**
     * Calculate current lag level
     * @returns {string}
     */
    calculateLagLevel() {
        if (this.tickTimes.length < 5) return 'UNKNOWN';
        
        // Get recent tick times
        const recentTicks = this.tickTimes.slice(-5);
        const averageTickTime = recentTicks.reduce((sum, time) => sum + time, 0) / recentTicks.length;
        
        // Get current TPS
        const currentTps = this.getCurrentTPS();
        
        // Determine lag level
        if (averageTickTime > this.severeLagThreshold || currentTps < 10) {
            return 'SEVERE';
        } else if (averageTickTime > this.lagThreshold || currentTps < 15) {
            return 'MODERATE';
        } else if (averageTickTime > 100 || currentTps < 18) {
            return 'MILD';
        } else {
            return 'NONE';
        }
    }

    /**
     * Handle lag level changes
     * @param {string} newLevel
     * @param {number} now
     */
    handleLagLevelChange(newLevel, now) {
        const oldLevel = this.currentLagLevel;
        this.currentLagLevel = newLevel;
        
        // Log lag level change
        if (newLevel !== 'NONE' && oldLevel === 'NONE') {
            this.lagStartTime = now;
            this.logger.warn(`Lag detected: ${newLevel}`);
        } else if (newLevel === 'NONE' && oldLevel !== 'NONE') {
            const lagDuration = now - this.lagStartTime;
            this.logger.info(`Lag cleared after ${Math.round(lagDuration / 1000)}s`);
        } else if (newLevel !== oldLevel) {
            this.logger.info(`Lag level changed: ${oldLevel} -> ${newLevel}`);
        }
        
        // Record lag event
        this.recordLagEvent({
            oldLevel,
            newLevel,
            timestamp: now,
            duration: newLevel === 'NONE' ? now - this.lagStartTime : 0,
            averageTickTime: this.getAverageTickTime(),
            currentTps: this.getCurrentTPS()
        });
        
        // Emit lag event
        if (this.bot.emit) {
            this.bot.emit('lag_detected', {
                lagLevel: newLevel,
                previousLevel: oldLevel,
                timestamp: now,
                stats: this.getStats()
            });
        }
    }

    /**
     * Check connection status
     * @param {number} now
     */
    checkConnection(now) {
        // Check for packet timeouts
        if (now - this.lastPacketTime > this.maxPacketTimeout) {
            this.packetTimeouts++;
            this.logger.warn(`Packet timeout detected (${this.packetTimeouts})`);
            this.lastPacketTime = now; // Reset to avoid spam
        }
    }

    /**
     * Update ping information
     */
    updatePing() {
        if (!this.bot._client) return;
        
        // Get ping from client if available
        const ping = this.bot._client.latency || 0;
        
        if (ping > 0) {
            this.pingHistory.push({
                ping,
                timestamp: Date.now()
            });
            
            // Keep only recent ping data
            if (this.pingHistory.length > this.maxPingHistory) {
                this.pingHistory.shift();
            }
        }
    }

    /**
     * Record a lag event
     * @param {Object} event
     */
    recordLagEvent(event) {
        this.lagEvents.push(event);
        
        // Keep only recent events
        if (this.lagEvents.length > this.maxLagEvents) {
            this.lagEvents.shift();
        }
    }

    /**
     * Get current TPS
     * @returns {number}
     */
    getCurrentTPS() {
        if (this.tpsHistory.length === 0) return 20;
        return this.tpsHistory[this.tpsHistory.length - 1].tps;
    }

    /**
     * Get average tick time
     * @returns {number}
     */
    getAverageTickTime() {
        if (this.tickTimes.length === 0) return 50;
        return this.tickTimes.reduce((sum, time) => sum + time, 0) / this.tickTimes.length;
    }

    /**
     * Get average ping
     * @returns {number}
     */
    getAveragePing() {
        if (this.pingHistory.length === 0) return 0;
        const recent = this.pingHistory.slice(-10);
        return recent.reduce((sum, entry) => sum + entry.ping, 0) / recent.length;
    }

    /**
     * Check if currently experiencing lag
     * @returns {boolean}
     */
    isLagging() {
        return this.currentLagLevel !== 'NONE';
    }

    /**
     * Check if experiencing severe lag
     * @returns {boolean}
     */
    isSevereLag() {
        return this.currentLagLevel === 'SEVERE';
    }

    /**
     * Reset all statistics
     */
    resetStats() {
        this.pingHistory.length = 0;
        this.tickTimes.length = 0;
        this.lagEvents.length = 0;
        this.tpsHistory.length = 0;
        this.currentLagLevel = 'NONE';
        this.packetTimeouts = 0;
        this.lastTickTime = Date.now();
        this.lastPacketTime = Date.now();
        this.logger.info('Lag detector statistics reset');
    }

    /**
     * Get lag detection statistics
     * @returns {Object}
     */
    getStats() {
        return {
            currentLagLevel: this.currentLagLevel,
            isLagging: this.isLagging(),
            currentTps: this.getCurrentTPS(),
            averageTickTime: Math.round(this.getAverageTickTime()),
            averagePing: Math.round(this.getAveragePing()),
            packetTimeouts: this.packetTimeouts,
            recentLagEvents: this.lagEvents.slice(-10),
            tpsHistory: this.tpsHistory.slice(-10),
            pingHistory: this.pingHistory.slice(-10),
            lagThreshold: this.lagThreshold,
            severeLagThreshold: this.severeLagThreshold
        };
    }

    /**
     * Set lag thresholds
     * @param {number} normal
     * @param {number} severe
     */
    setThresholds(normal, severe) {
        this.lagThreshold = normal;
        this.severeLagThreshold = severe;
        this.logger.info(`Lag thresholds updated: ${normal}ms (normal), ${severe}ms (severe)`);
    }
}

module.exports = LagDetector;

