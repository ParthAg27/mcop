const { EventEmitter } = require('events');

/**
 * Event fired when packets are sent or received
 * 1:1 replica of PacketEvent.java
 */
class PacketEvent extends EventEmitter {
    constructor(packet, direction) {
        super();
        this.packet = packet;
        this.direction = direction; // 'incoming' or 'outgoing'
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    /**
     * Get the packet data
     * @returns {Object}
     */
    getPacket() {
        return this.packet;
    }

    /**
     * Get the packet direction
     * @returns {string} 'incoming' or 'outgoing'
     */
    getDirection() {
        return this.direction;
    }

    /**
     * Check if this is an incoming packet
     * @returns {boolean}
     */
    isIncoming() {
        return this.direction === 'incoming';
    }

    /**
     * Check if this is an outgoing packet
     * @returns {boolean}
     */
    isOutgoing() {
        return this.direction === 'outgoing';
    }

    /**
     * Get the packet name/type
     * @returns {string}
     */
    getPacketName() {
        return this.packet.name || this.packet.constructor.name || 'unknown';
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
        return `PacketEvent{packet=${this.getPacketName()}, direction=${this.direction}}`;
    }
}

module.exports = PacketEvent;

