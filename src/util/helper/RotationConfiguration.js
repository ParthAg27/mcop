/**
 * RotationConfiguration - Configuration class for rotation settings
 * Perfect 1:1 replica of Java RotationConfiguration.java
 */

const Target = require('./Target');
const Angle = require('./Angle');

class RotationConfiguration {
    constructor(target, options = {}) {
        // Ensure target is a Target object
        if (target instanceof Angle) {
            this.target = new Target(target);
        } else if (target instanceof Target) {
            this.target = target;
        } else {
            this.target = new Target(new Angle(0, 0));
        }
        
        // Configuration options
        this.duration = options.duration || 1000; // Duration in milliseconds
        this.smooth = options.smooth !== undefined ? options.smooth : true;
        this.randomness = options.randomness || 0.1; // Randomness factor (0-1)
        this.priority = options.priority || 1; // Priority level
        this.easing = options.easing || 'easeInOutCubic'; // Easing function type
        this.onComplete = options.onComplete || null; // Completion callback
        this.onProgress = options.onProgress || null; // Progress callback
        
        // Advanced options
        this.maxSpeed = options.maxSpeed || 360; // Max degrees per second
        this.minSpeed = options.minSpeed || 30; // Min degrees per second
        this.acceleration = options.acceleration || 1.0; // Acceleration factor
        this.overshoot = options.overshoot || false; // Allow slight overshoot for natural movement
        this.humanization = options.humanization !== undefined ? options.humanization : true;
        
        // Timing
        this.startTime = 0;
        this.endTime = 0;
        this.pauseTime = 0;
        this.paused = false;
    }
    
    /**
     * Get the target for this rotation
     * @returns {Target} - Target object
     */
    getTarget() {
        return this.target;
    }
    
    /**
     * Set the target for this rotation
     * @param {Target|Angle} target - New target
     */
    setTarget(target) {
        if (target instanceof Angle) {
            this.target = new Target(target);
        } else if (target instanceof Target) {
            this.target = target;
        }
    }
    
    /**
     * Get rotation duration
     * @returns {number} - Duration in milliseconds
     */
    getDuration() {
        return this.duration;
    }
    
    /**
     * Set rotation duration
     * @param {number} duration - Duration in milliseconds
     */
    setDuration(duration) {
        this.duration = Math.max(1, duration);
    }
    
    /**
     * Check if smooth rotation is enabled
     * @returns {boolean} - True if smooth
     */
    isSmooth() {
        return this.smooth;
    }
    
    /**
     * Set smooth rotation
     * @param {boolean} smooth - Whether to use smooth rotation
     */
    setSmooth(smooth) {
        this.smooth = smooth;
    }
    
    /**
     * Get randomness factor
     * @returns {number} - Randomness factor (0-1)
     */
    getRandomness() {
        return this.randomness;
    }
    
    /**
     * Set randomness factor
     * @param {number} randomness - Randomness factor (0-1)
     */
    setRandomness(randomness) {
        this.randomness = Math.max(0, Math.min(1, randomness));
    }
    
    /**
     * Get priority
     * @returns {number} - Priority level
     */
    getPriority() {
        return this.priority;
    }
    
    /**
     * Set priority
     * @param {number} priority - Priority level
     */
    setPriority(priority) {
        this.priority = priority;
    }
    
    /**
     * Get easing function type
     * @returns {string} - Easing function name
     */
    getEasing() {
        return this.easing;
    }
    
    /**
     * Set easing function type
     * @param {string} easing - Easing function name
     */
    setEasing(easing) {
        this.easing = easing;
    }
    
    /**
     * Check if humanization is enabled
     * @returns {boolean} - True if humanization enabled
     */
    isHumanizationEnabled() {
        return this.humanization;
    }
    
    /**
     * Set humanization
     * @param {boolean} humanization - Whether to enable humanization
     */
    setHumanization(humanization) {
        this.humanization = humanization;
    }
    
    /**
     * Start the rotation configuration
     */
    start() {
        this.startTime = Date.now();
        this.endTime = this.startTime + this.duration;
        this.paused = false;
    }
    
    /**
     * Pause the rotation
     */
    pause() {
        if (!this.paused) {
            this.pauseTime = Date.now();
            this.paused = true;
        }
    }
    
    /**
     * Resume the rotation
     */
    resume() {
        if (this.paused) {
            const pauseDuration = Date.now() - this.pauseTime;
            this.endTime += pauseDuration;
            this.paused = false;
        }
    }
    
    /**
     * Check if rotation is complete
     * @returns {boolean} - True if complete
     */
    isComplete() {
        return !this.paused && Date.now() >= this.endTime;
    }
    
    /**
     * Get progress (0-1)
     * @returns {number} - Progress from 0 to 1
     */
    getProgress() {
        if (this.paused || this.duration === 0) {
            return 0;
        }
        
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, Math.min(1, elapsed / this.duration));
    }
    
    /**
     * Set completion callback
     * @param {Function} callback - Callback function
     */
    onComplete(callback) {
        this.onComplete = callback;
    }
    
    /**
     * Set progress callback
     * @param {Function} callback - Callback function
     */
    onProgress(callback) {
        this.onProgress = callback;
    }
    
    /**
     * Clone this configuration
     * @returns {RotationConfiguration} - Cloned configuration
     */
    clone() {
        const cloned = new RotationConfiguration(this.target, {
            duration: this.duration,
            smooth: this.smooth,
            randomness: this.randomness,
            priority: this.priority,
            easing: this.easing,
            maxSpeed: this.maxSpeed,
            minSpeed: this.minSpeed,
            acceleration: this.acceleration,
            overshoot: this.overshoot,
            humanization: this.humanization
        });
        
        cloned.onComplete = this.onComplete;
        cloned.onProgress = this.onProgress;
        
        return cloned;
    }
    
    toString() {
        return `RotationConfiguration{target=${this.target}, duration=${this.duration}ms, smooth=${this.smooth}, priority=${this.priority}}`;
    }
}

module.exports = RotationConfiguration;

