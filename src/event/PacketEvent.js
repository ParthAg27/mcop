/**
 * PacketEvent
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.event.PacketEvent
 * Fired when network packets are sent or received
 */
class PacketEvent {
    constructor(direction, packet, packetName) {
        this.direction = direction; // 'INBOUND' or 'OUTBOUND'
        this.packet = packet;
        this.packetName = packetName;
        this.cancelled = false;
    }

    /**
     * Gets the packet direction
     * @return Direction string
     */
    getDirection() {
        return this.direction;
    }

    /**
     * Gets the packet data
     * @return Packet object
     */
    getPacket() {
        return this.packet;
    }

    /**
     * Gets the packet name/type
     * @return Packet name
     */
    getPacketName() {
        return this.packetName;
    }

    /**
     * Checks if this is an inbound packet
     * @return True if inbound
     */
    isInbound() {
        return this.direction === 'INBOUND';
    }

    /**
     * Checks if this is an outbound packet
     * @return True if outbound
     */
    isOutbound() {
        return this.direction === 'OUTBOUND';
    }

    /**
     * Cancels the packet (prevents processing)
     */
    setCancelled(cancelled) {
        this.cancelled = cancelled;
    }

    /**
     * Checks if packet is cancelled
     * @return True if cancelled
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * String representation of the event
     * @return String description
     */
    toString() {
        return `PacketEvent{direction=${this.direction}, packetName=${this.packetName}, cancelled=${this.cancelled}}`;
    }
}

// Direction constants
PacketEvent.Direction = {
    INBOUND: 'INBOUND',
    OUTBOUND: 'OUTBOUND'
};

module.exports = PacketEvent;

