/**
 * StrafeUtil - Utility for strafing and movement control
 * Perfect 1:1 replica of Java StrafeUtil.java
 */

class StrafeUtil {
    static enabled = false;
    static forceStop = false;
    static yaw = 0.0;
    
    /**
     * Check if strafing should be enabled
     * @returns {boolean} - True if should enable
     */
    static shouldEnable() {
        return !StrafeUtil.forceStop && StrafeUtil.enabled;
    }
    
    /**
     * Enable strafing
     * @param {number} targetYaw - Target yaw for strafing
     */
    static enable(targetYaw = 0) {
        StrafeUtil.enabled = true;
        StrafeUtil.forceStop = false;
        StrafeUtil.yaw = targetYaw;
    }
    
    /**
     * Disable strafing
     */
    static disable() {
        StrafeUtil.enabled = false;
        StrafeUtil.forceStop = false;
    }
    
    /**
     * Force stop strafing
     */
    static forceStopStrafe() {
        StrafeUtil.forceStop = true;
        StrafeUtil.enabled = false;
    }
    
    /**
     * Set target yaw for strafing
     * @param {number} newYaw - New yaw angle
     */
    static setYaw(newYaw) {
        StrafeUtil.yaw = newYaw;
    }
    
    /**
     * Get current yaw
     * @returns {number} - Current yaw
     */
    static getYaw() {
        return StrafeUtil.yaw;
    }
    
    /**
     * Check if strafing is enabled
     * @returns {boolean} - True if enabled
     */
    static isEnabled() {
        return StrafeUtil.enabled;
    }
    
    /**
     * Check if force stop is active
     * @returns {boolean} - True if force stopped
     */
    static isForceStopped() {
        return StrafeUtil.forceStop;
    }
    
    /**
     * Reset all strafe settings
     */
    static reset() {
        StrafeUtil.enabled = false;
        StrafeUtil.forceStop = false;
        StrafeUtil.yaw = 0.0;
    }
}

module.exports = StrafeUtil;

