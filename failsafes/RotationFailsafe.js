/**
 * RotationFailsafe - Detects suspicious rotation changes and disables macro
 * Perfect 1:1 replica of Java RotationFailsafe.java
 */

const AbstractFailsafe = require('./AbstractFailsafe');
const MacroManager = require('../src/macro/MacroManager');
const Logger = require('../src/util/Logger');
const Clock = require('../src/util/Clock');
const Angle = require('../src/util/helper/Angle');

class RotationFailsafe extends AbstractFailsafe {
    static instance = null;
    
    constructor() {
        super();
        this.triggerCheck = new Clock();
        this.rotationBeforeReacting = null;
        this.lastKnownRotation = null;
    }
    
    static getInstance() {
        if (!RotationFailsafe.instance) {
            RotationFailsafe.instance = new RotationFailsafe();
        }
        return RotationFailsafe.instance;
    }
    
    getName() {
        return "RotationFailsafe";
    }
    
    getFailsafeType() {
        return "ROTATION";
    }
    
    getPriority() {
        return 5;
    }
    
    /**
     * Handle packet reception for rotation changes
     * @param {Object} packet - Received packet
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if should trigger failsafe
     */
    onPacketReceive(packet, bot) {
        if (!MacroManager.getInstance().isEnabled()) {
            return false;
        }
        
        try {
            // Check for position/look packets that might indicate forced rotation
            if (packet && (packet.name === 'position_and_look' || packet.name === 'look')) {
                const packetYaw = packet.yaw || 0;
                const packetPitch = packet.pitch || 0;
                const playerYaw = bot.entity.yaw || 0;
                const playerPitch = bot.entity.pitch || 0;
                
                // Calculate rotation differences
                let yawDifference = Math.abs(playerYaw - packetYaw);
                let pitchDifference = Math.abs(playerPitch - packetPitch);
                
                // Normalize angles to 0-360 range
                yawDifference = Math.min(yawDifference, 360 - yawDifference);
                pitchDifference = Math.min(pitchDifference, 360 - pitchDifference);
                
                // Skip if this is just a 360-degree wrap with no pitch change
                if (yawDifference === 360 && pitchDifference === 0) {
                    return false;
                }
                
                if (this.shouldTriggerCheck(packetYaw, packetPitch, bot)) {
                    if (this.rotationBeforeReacting === null) {
                        this.rotationBeforeReacting = new Angle(playerYaw, playerPitch);
                    }
                    this.triggerCheck.schedule(500); // 500ms delay
                }
            }
            
            return false;
        } catch (error) {
            Logger.error(`[RotationFailsafe] Error in onPacketReceive: ${error.message}`);
            return false;
        }
    }
    
    onTick(bot) {
        if (!MacroManager.getInstance().isEnabled()) {
            this.rotationBeforeReacting = null;
            return false;
        }
        
        try {
            // Update last known rotation
            if (bot && bot.entity) {
                this.lastKnownRotation = new Angle(bot.entity.yaw, bot.entity.pitch);
            }
            
            // Check if trigger delay has passed
            if (this.triggerCheck.passed() && this.triggerCheck.isScheduled()) {
                if (this.rotationBeforeReacting === null) {
                    return false;
                }
                
                // Check if rotation is still suspicious
                if (this.shouldTriggerCheck(
                    this.rotationBeforeReacting.getYaw(),
                    this.rotationBeforeReacting.getPitch(),
                    bot
                )) {
                    Logger.warn(`[RotationFailsafe] Suspicious rotation detected!`);
                    return true;
                }
                
                // Reset if rotation is now normal
                this.rotationBeforeReacting = null;
                this.triggerCheck.reset();
            }
            
            return false;
        } catch (error) {
            Logger.error(`[RotationFailsafe] Error in onTick: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if rotation change should trigger the failsafe
     * @param {number} newYaw - New yaw value
     * @param {number} newPitch - New pitch value
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if should trigger
     */
    shouldTriggerCheck(newYaw, newPitch, bot) {
        if (!bot || !bot.entity) {
            return false;
        }
        
        const currentYaw = bot.entity.yaw;
        const currentPitch = bot.entity.pitch;
        
        // Calculate differences
        let yawDiff = Math.abs(newYaw - currentYaw) % 360;
        let pitchDiff = Math.abs(newPitch - currentPitch) % 360;
        
        // Normalize to shortest angular distance
        yawDiff = Math.min(yawDiff, 360 - yawDiff);
        pitchDiff = Math.min(pitchDiff, 360 - pitchDiff);
        
        // Trigger if differences are significant (threshold: 10 degrees)
        return yawDiff >= 10 || pitchDiff >= 10;
    }
    
    react() {
        try {
            MacroManager.getInstance().disable();
            Logger.sendWarning("You've got rotated! Disabling macro.");
            
            // Reset state
            this.rotationBeforeReacting = null;
            this.triggerCheck.reset();
            
            return true;
        } catch (error) {
            Logger.error(`[RotationFailsafe] Error in react: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Reset the failsafe state
     */
    reset() {
        this.rotationBeforeReacting = null;
        this.lastKnownRotation = null;
        this.triggerCheck.reset();
    }
}

module.exports = RotationFailsafe;

