const { EventEmitter } = require('events');

/**
 * Event fired when player motion is updated
 * 1:1 replica of MotionUpdateEvent.java
 */
class MotionUpdateEvent extends EventEmitter {
    constructor(x, y, z, yaw, pitch, onGround) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
        this.yaw = yaw;
        this.pitch = pitch;
        this.onGround = onGround;
        this.timestamp = Date.now();
        this.cancelled = false;
        this.pre = true; // Whether this is a pre or post motion event
    }

    /**
     * Get the X coordinate
     * @returns {number}
     */
    getX() {
        return this.x;
    }

    /**
     * Get the Y coordinate
     * @returns {number}
     */
    getY() {
        return this.y;
    }

    /**
     * Get the Z coordinate
     * @returns {number}
     */
    getZ() {
        return this.z;
    }

    /**
     * Get the yaw rotation
     * @returns {number}
     */
    getYaw() {
        return this.yaw;
    }

    /**
     * Get the pitch rotation
     * @returns {number}
     */
    getPitch() {
        return this.pitch;
    }

    /**
     * Check if the player is on ground
     * @returns {boolean}
     */
    isOnGround() {
        return this.onGround;
    }

    /**
     * Set the X coordinate
     * @param {number} x
     */
    setX(x) {
        this.x = x;
    }

    /**
     * Set the Y coordinate
     * @param {number} y
     */
    setY(y) {
        this.y = y;
    }

    /**
     * Set the Z coordinate
     * @param {number} z
     */
    setZ(z) {
        this.z = z;
    }

    /**
     * Set the yaw rotation
     * @param {number} yaw
     */
    setYaw(yaw) {
        this.yaw = yaw;
    }

    /**
     * Set the pitch rotation
     * @param {number} pitch
     */
    setPitch(pitch) {
        this.pitch = pitch;
    }

    /**
     * Set whether the player is on ground
     * @param {boolean} onGround
     */
    setOnGround(onGround) {
        this.onGround = onGround;
    }

    /**
     * Check if this is a pre-motion event
     * @returns {boolean}
     */
    isPre() {
        return this.pre;
    }

    /**
     * Set whether this is a pre-motion event
     * @param {boolean} pre
     */
    setPre(pre) {
        this.pre = pre;
    }

    /**
     * Get the position as an object
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return { x: this.x, y: this.y, z: this.z };
    }

    /**
     * Get the rotation as an object
     * @returns {{yaw: number, pitch: number}}
     */
    getRotation() {
        return { yaw: this.yaw, pitch: this.pitch };
    }

    /**
     * Get the timestamp when this event occurred
     * @returns {number}
     */
    getTimestamp() {
        return this.timestamp;
    }

    /**
     * Check if this event has been cancelled
     * @returns {boolean}
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * Set the cancelled state of this event
     * @param {boolean} cancelled
     */
    setCancelled(cancelled) {
        this.cancelled = cancelled;
    }

    /**
     * Get a string representation of this event
     * @returns {string}
     */
    toString() {
        return `MotionUpdateEvent{x=${this.x}, y=${this.y}, z=${this.z}, ` +
               `yaw=${this.yaw}, pitch=${this.pitch}, onGround=${this.onGround}}`;
    }
}

module.exports = MotionUpdateEvent;

