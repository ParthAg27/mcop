const { EventEmitter } = require('events');

/**
 * Event fired when a block is destroyed/broken
 * 1:1 replica of BlockDestroyEvent.java
 */
class BlockDestroyEvent extends EventEmitter {
    constructor(position, block, tool, player) {
        super();
        this.position = position; // {x, y, z}
        this.block = block; // Block object
        this.tool = tool; // Tool used
        this.player = player; // Player who broke it
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    getPosition() {
        return this.position;
    }

    getBlock() {
        return this.block;
    }

    getTool() {
        return this.tool;
    }

    getPlayer() {
        return this.player;
    }

    getBlockType() {
        return this.block ? this.block.type : null;
    }

    getBlockName() {
        return this.block ? this.block.name : null;
    }

    getTimestamp() {
        return this.timestamp;
    }

    isCancelled() {
        return this.cancelled;
    }

    setCancelled(cancelled) {
        this.cancelled = cancelled;
    }

    toString() {
        return `BlockDestroyEvent{pos=${JSON.stringify(this.position)}, block=${this.getBlockName()}}`;
    }
}

module.exports = BlockDestroyEvent;

