/**
 * BlockChangeEvent
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.event.BlockChangeEvent
 * Fired when a block is changed/broken in the world
 */
class BlockChangeEvent {
    constructor(position, oldBlock, newBlock, update) {
        this.position = position;
        this.oldBlock = oldBlock;
        this.newBlock = newBlock;
        this.update = update || false;
        this.cancelled = false;
    }

    /**
     * Gets the position where the block changed
     * @return Block position
     */
    getPosition() {
        return this.position;
    }

    /**
     * Gets the old block that was there
     * @return Old block
     */
    getOldBlock() {
        return this.oldBlock;
    }

    /**
     * Gets the new block that replaced it
     * @return New block
     */
    getNewBlock() {
        return this.newBlock;
    }

    /**
     * Checks if this is an update event
     * @return True if update
     */
    isUpdate() {
        return this.update;
    }

    /**
     * Cancels the event
     */
    setCancelled(cancelled) {
        this.cancelled = cancelled;
    }

    /**
     * Checks if event is cancelled
     * @return True if cancelled
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * Checks if the block was broken (new block is air)
     * @return True if block was broken
     */
    isBlockBroken() {
        return this.newBlock && (this.newBlock.name === 'air' || this.newBlock.type === 0);
    }

    /**
     * Checks if the block was placed (old block was air)
     * @return True if block was placed
     */
    isBlockPlaced() {
        return this.oldBlock && (this.oldBlock.name === 'air' || this.oldBlock.type === 0) &&
               this.newBlock && (this.newBlock.name !== 'air' && this.newBlock.type !== 0);
    }

    /**
     * Gets the block type that was broken (if any)
     * @return Block type or null
     */
    getBrokenBlockType() {
        if (this.isBlockBroken()) {
            return this.oldBlock;
        }
        return null;
    }

    /**
     * Gets the block type that was placed (if any)
     * @return Block type or null
     */
    getPlacedBlockType() {
        if (this.isBlockPlaced()) {
            return this.newBlock;
        }
        return null;
    }

    /**
     * String representation of the event
     * @return String description
     */
    toString() {
        return `BlockChangeEvent{position=${this.position}, oldBlock=${this.oldBlock?.name || 'null'}, newBlock=${this.newBlock?.name || 'null'}, update=${this.update}}`;
    }
}

module.exports = BlockChangeEvent;

