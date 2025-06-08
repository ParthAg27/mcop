/**
 * MineableBlock - Represents a block that can be mined
 * Perfect 1:1 replica of Java MineableBlock.java
 */

const { Vec3 } = require('vec3');

class MineableBlock {
    constructor(position, type, hardness = 1.0) {
        this.position = position instanceof Vec3 ? position : new Vec3(position.x, position.y, position.z);
        this.type = type;
        this.hardness = hardness;
        this.lastMined = 0;
        this.miningAttempts = 0;
        this.isVisible = true;
        this.priority = 0;
    }
    
    /**
     * Get the position of this block
     * @returns {Vec3} - Block position
     */
    getPosition() {
        return this.position;
    }
    
    /**
     * Get the block type
     * @returns {string} - Block type
     */
    getType() {
        return this.type;
    }
    
    /**
     * Get the hardness of this block
     * @returns {number} - Block hardness
     */
    getHardness() {
        return this.hardness;
    }
    
    /**
     * Set the hardness of this block
     * @param {number} hardness - New hardness value
     */
    setHardness(hardness) {
        this.hardness = hardness;
    }
    
    /**
     * Get the last time this block was mined
     * @returns {number} - Timestamp
     */
    getLastMined() {
        return this.lastMined;
    }
    
    /**
     * Set the last time this block was mined
     * @param {number} time - Timestamp
     */
    setLastMined(time) {
        this.lastMined = time;
    }
    
    /**
     * Get the number of mining attempts
     * @returns {number} - Number of attempts
     */
    getMiningAttempts() {
        return this.miningAttempts;
    }
    
    /**
     * Increment mining attempts
     */
    incrementMiningAttempts() {
        this.miningAttempts++;
    }
    
    /**
     * Reset mining attempts
     */
    resetMiningAttempts() {
        this.miningAttempts = 0;
    }
    
    /**
     * Check if this block is visible
     * @returns {boolean} - True if visible
     */
    isBlockVisible() {
        return this.isVisible;
    }
    
    /**
     * Set visibility of this block
     * @param {boolean} visible - Visibility state
     */
    setVisible(visible) {
        this.isVisible = visible;
    }
    
    /**
     * Get the priority of this block
     * @returns {number} - Priority value
     */
    getPriority() {
        return this.priority;
    }
    
    /**
     * Set the priority of this block
     * @param {number} priority - Priority value
     */
    setPriority(priority) {
        this.priority = priority;
    }
    
    /**
     * Check if this block can be mined
     * @returns {boolean} - True if mineable
     */
    canMine() {
        const now = Date.now();
        const timeSinceLastMined = now - this.lastMined;
        return this.isVisible && timeSinceLastMined > 1000; // 1 second cooldown
    }
    
    /**
     * Calculate mining time based on hardness
     * @param {number} miningSpeed - Mining speed multiplier
     * @returns {number} - Time in milliseconds
     */
    calculateMiningTime(miningSpeed = 1.0) {
        return (this.hardness * 1000) / miningSpeed;
    }
    
    /**
     * Calculate distance to another position
     * @param {Vec3} position - Target position
     * @returns {number} - Distance
     */
    distanceTo(position) {
        return this.position.distanceTo(position);
    }
    
    /**
     * Check if this block equals another block
     * @param {MineableBlock} other - Other block
     * @returns {boolean} - True if equal
     */
    equals(other) {
        if (!(other instanceof MineableBlock)) return false;
        return this.position.equals(other.position) && this.type === other.type;
    }
    
    /**
     * Get hash code for this block
     * @returns {string} - Hash code
     */
    hashCode() {
        return `${this.position.x}_${this.position.y}_${this.position.z}_${this.type}`;
    }
    
    /**
     * Clone this block
     * @returns {MineableBlock} - Cloned block
     */
    clone() {
        const cloned = new MineableBlock(this.position.clone(), this.type, this.hardness);
        cloned.lastMined = this.lastMined;
        cloned.miningAttempts = this.miningAttempts;
        cloned.isVisible = this.isVisible;
        cloned.priority = this.priority;
        return cloned;
    }
    
    toString() {
        return `MineableBlock{pos=${this.position}, type=${this.type}, hardness=${this.hardness}, priority=${this.priority}}`;
    }
}

module.exports = MineableBlock;

