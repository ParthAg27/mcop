/**
 * RotationHandler - Advanced rotation management system
 * Perfect 1:1 replica of Java RotationHandler.java
 */

const AngleUtil = require('../util/AngleUtil');
const Angle = require('../util/helper/Angle');
const Target = require('../util/helper/Target');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const Logger = require('../util/Logger');

class RotationConfiguration {
    constructor(target, duration = 1000, smooth = true, randomness = 0.1) {
        this.target = target;
        this.duration = duration;
        this.smooth = smooth;
        this.randomness = randomness;
        this.priority = 1;
    }
}

class RotationHandler {
    static instance = null;
    
    constructor() {
        this.rotations = [];
        this.startRotation = new Angle(0, 0);
        this.target = new Target(new Angle(0, 0));
        this.enabled = false;
        this.startTime = 0;
        this.endTime = 0;
        this.configuration = null;
        
        // Bezier rotation tracking
        this.lastBezierYaw = 0;
        this.lastBezierPitch = 0;
        
        // Server-side rotation tracking
        this.serverSideYaw = 0;
        this.serverSidePitch = 0;
        
        // Random multipliers for natural movement
        this.randomMultiplier1 = 1;
        this.randomMultiplier2 = 1;
        
        // State flags
        this.followingTarget = false;
        this.stopRequested = false;
        
        // Random generator
        this.random = Math.random;
    }
    
    static getInstance() {
        if (!RotationHandler.instance) {
            RotationHandler.instance = new RotationHandler();
        }
        return RotationHandler.instance;
    }
    
    /**
     * Queue rotation configurations
     * @param {...RotationConfiguration} configs - Rotation configurations to queue
     * @returns {RotationHandler} - This instance for chaining
     */
    queueRotation(...configs) {
        this.rotations.push(...configs);
        return this;
    }
    
    /**
     * Rotate to a specific target
     * @param {Target|Angle|Vec3} target - Target to rotate to
     * @param {number} duration - Duration in milliseconds
     * @param {boolean} smooth - Whether to use smooth rotation
     * @returns {RotationHandler} - This instance for chaining
     */
    rotateTo(target, duration = 1000, smooth = true) {
        const config = new RotationConfiguration(target, duration, smooth);
        return this.queueRotation(config);
    }
    
    /**
     * Start following a target continuously
     * @param {Target} target - Target to follow
     */
    startFollowing(target) {
        this.target = target;
        this.followingTarget = true;
        this.enabled = true;
        Logger.info("[RotationHandler] Started following target");
    }
    
    /**
     * Stop following target
     */
    stopFollowing() {
        this.followingTarget = false;
        this.stopRequested = true;
        Logger.info("[RotationHandler] Stopped following target");
    }
    
    /**
     * Main tick handler for rotations
     * @param {Object} bot - Mineflayer bot instance
     */
    onTick(bot) {
        if (!bot || !bot.entity) return;
        
        try {
            // Process queued rotations
            if (this.rotations.length > 0 && !this.enabled) {
                this.startNextRotation(bot);
            }
            
            // Handle active rotation
            if (this.enabled) {
                this.updateRotation(bot);
            }
            
            // Handle continuous target following
            if (this.followingTarget && this.target) {
                this.updateTargetFollowing(bot);
            }
        } catch (error) {
            Logger.error(`[RotationHandler] Error in onTick: ${error.message}`);
        }
    }
    
    /**
     * Start the next rotation in the queue
     * @param {Object} bot - Mineflayer bot instance
     */
    startNextRotation(bot) {
        if (this.rotations.length === 0) return;
        
        this.configuration = this.rotations.shift();
        this.enabled = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.configuration.duration;
        
        // Record starting rotation
        this.startRotation.setYaw(bot.entity.yaw);
        this.startRotation.setPitch(bot.entity.pitch);
        
        // Generate random multipliers for natural movement
        this.randomMultiplier1 = 1 + (this.random() - 0.5) * 0.2;
        this.randomMultiplier2 = 1 + (this.random() - 0.5) * 0.2;
        
        Logger.debug("[RotationHandler] Started rotation");
    }
    
    /**
     * Update current rotation progress
     * @param {Object} bot - Mineflayer bot instance
     */
    updateRotation(bot) {
        const now = Date.now();
        
        if (now >= this.endTime || this.stopRequested) {
            this.completeRotation(bot);
            return;
        }
        
        const progress = (now - this.startTime) / (this.endTime - this.startTime);
        const targetAngle = this.configuration.target.getTargetAngle();
        
        if (this.configuration.smooth) {
            this.applySmoothRotation(bot, progress, targetAngle);
        } else {
            this.applyInstantRotation(bot, targetAngle);
        }
    }
    
    /**
     * Apply smooth rotation using easing functions
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} progress - Progress from 0 to 1
     * @param {Angle} targetAngle - Target angle
     */
    applySmoothRotation(bot, progress, targetAngle) {
        // Use cubic easing for natural movement
        const easedProgress = this.easeInOutCubic(progress);
        
        const startYaw = this.startRotation.getYaw();
        const startPitch = this.startRotation.getPitch();
        const targetYaw = targetAngle.getYaw();
        const targetPitch = targetAngle.getPitch();
        
        // Calculate angle differences (handling wrap-around)
        let yawDiff = targetYaw - startYaw;
        let pitchDiff = targetPitch - startPitch;
        
        // Normalize angle differences
        if (yawDiff > 180) yawDiff -= 360;
        if (yawDiff < -180) yawDiff += 360;
        if (pitchDiff > 90) pitchDiff = 90;
        if (pitchDiff < -90) pitchDiff = -90;
        
        // Apply randomness for natural movement
        const randomYaw = (this.random() - 0.5) * this.configuration.randomness * this.randomMultiplier1;
        const randomPitch = (this.random() - 0.5) * this.configuration.randomness * this.randomMultiplier2;
        
        // Calculate new rotation
        const newYaw = startYaw + (yawDiff * easedProgress) + randomYaw;
        const newPitch = Math.max(-90, Math.min(90, startPitch + (pitchDiff * easedProgress) + randomPitch));
        
        // Apply rotation
        this.setRotation(bot, newYaw, newPitch);
        
        // Update tracking
        this.lastBezierYaw = newYaw;
        this.lastBezierPitch = newPitch;
    }
    
    /**
     * Apply instant rotation
     * @param {Object} bot - Mineflayer bot instance
     * @param {Angle} targetAngle - Target angle
     */
    applyInstantRotation(bot, targetAngle) {
        this.setRotation(bot, targetAngle.getYaw(), targetAngle.getPitch());
    }
    
    /**
     * Update continuous target following
     * @param {Object} bot - Mineflayer bot instance
     */
    updateTargetFollowing(bot) {
        if (!this.target || !this.target.isValid()) {
            this.stopFollowing();
            return;
        }
        
        const targetAngle = this.target.getTargetAngle();
        
        // Apply smooth following with reduced intensity
        const currentYaw = bot.entity.yaw;
        const currentPitch = bot.entity.pitch;
        
        let yawDiff = targetAngle.getYaw() - currentYaw;
        let pitchDiff = targetAngle.getPitch() - currentPitch;
        
        // Normalize angle differences
        if (yawDiff > 180) yawDiff -= 360;
        if (yawDiff < -180) yawDiff += 360;
        
        // Apply gradual movement (10% per tick)
        const followSpeed = 0.1;
        const newYaw = currentYaw + (yawDiff * followSpeed);
        const newPitch = Math.max(-90, Math.min(90, currentPitch + (pitchDiff * followSpeed)));
        
        this.setRotation(bot, newYaw, newPitch);
    }
    
    /**
     * Complete current rotation
     * @param {Object} bot - Mineflayer bot instance
     */
    completeRotation(bot) {
        if (this.configuration && !this.stopRequested) {
            // Ensure we reach the exact target
            const targetAngle = this.configuration.target.getTargetAngle();
            this.setRotation(bot, targetAngle.getYaw(), targetAngle.getPitch());
        }
        
        this.enabled = false;
        this.stopRequested = false;
        this.configuration = null;
        
        Logger.debug("[RotationHandler] Completed rotation");
    }
    
    /**
     * Set bot rotation
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} yaw - Yaw angle
     * @param {number} pitch - Pitch angle
     */
    setRotation(bot, yaw, pitch) {
        if (!bot || !bot.entity) return;
        
        try {
            // Normalize angles
            yaw = yaw % 360;
            if (yaw < 0) yaw += 360;
            pitch = Math.max(-90, Math.min(90, pitch));
            
            // Apply rotation
            bot.look(yaw * (Math.PI / 180), pitch * (Math.PI / 180), true);
            
            // Update server-side tracking
            this.serverSideYaw = yaw;
            this.serverSidePitch = pitch;
        } catch (error) {
            Logger.error(`[RotationHandler] Error setting rotation: ${error.message}`);
        }
    }
    
    /**
     * Cubic easing function for smooth movement
     * @param {number} t - Progress from 0 to 1
     * @returns {number} - Eased progress
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Check if handler is currently rotating
     * @returns {boolean} - True if rotating
     */
    isRotating() {
        return this.enabled || this.followingTarget;
    }
    
    /**
     * Get current rotation configuration
     * @returns {RotationConfiguration|null} - Current config or null
     */
    getConfiguration() {
        return this.configuration;
    }
    
    /**
     * Clear all queued rotations
     */
    clearQueue() {
        this.rotations = [];
        this.enabled = false;
        this.followingTarget = false;
        this.stopRequested = false;
    }
    
    /**
     * Get server-side rotation
     * @returns {Object} - {yaw, pitch}
     */
    getServerRotation() {
        return {
            yaw: this.serverSideYaw,
            pitch: this.serverSidePitch
        };
    }
}

// Export both the handler and configuration class
RotationHandler.RotationConfiguration = RotationConfiguration;

module.exports = RotationHandler;

