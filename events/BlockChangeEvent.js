const { EventEmitter } = require('events');

/**
 * Event fired when a block changes in the world
 * 1:1 replica of BlockChangeEvent.java
 */
class BlockChangeEvent extends EventEmitter {
    constructor(position, oldBlock, newBlock) {
        super();
        this.position = position; // {x, y, z}
        this.oldBlock = oldBlock; // Block object
        this.newBlock = newBlock; // Block object
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    /**
     * Get the position where the block changed
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return this.position;
    }

    /**
     * Get the old block that was replaced
     * @returns {Object}
     */
    getOldBlock() {
        return this.oldBlock;
    }

    /**
     * Get the new block that replaced the old one
     * @returns {Object}
     */
    getNewBlock() {
        return this.newBlock;
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
     * Check if the block was destroyed (became air)
     * @returns {boolean}
     */
    wasDestroyed() {
        return this.newBlock && (this.newBlock.type === 0 || this.newBlock.name === 'air');
    }

    /**
     * Check if the block was placed (was air before)
     * @returns {boolean}
     */
    wasPlaced() {
        return this.oldBlock && (this.oldBlock.type === 0 || this.oldBlock.name === 'air') && 
               this.newBlock && this.newBlock.type !== 0;
    }

    /**
     * Get a string representation of this event
     * @returns {string}
     */
    toString() {
        return `BlockChangeEvent{position=${JSON.stringify(this.position)}, ` +
               `oldBlock=${this.oldBlock?.name || 'null'}, ` +
               `newBlock=${this.newBlock?.name || 'null'}}`;
    }
}

module.exports = BlockChangeEvent;

