const { EventEmitter } = require('events');

/**
 * Event fired when particles are spawned
 * 1:1 replica of SpawnParticleEvent.java
 */
class SpawnParticleEvent extends EventEmitter {
    constructor(particleType, position, velocity, count) {
        super();
        this.particleType = particleType;
        this.position = position; // {x, y, z}
        this.velocity = velocity; // {x, y, z}
        this.count = count || 1;
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    getParticleType() {
        return this.particleType;
    }

    getPosition() {
        return this.position;
    }

    getVelocity() {
        return this.velocity;
    }

    getCount() {
        return this.count;
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
        return `SpawnParticleEvent{type=${this.particleType}, pos=${JSON.stringify(this.position)}}`;
    }
}

module.exports = SpawnParticleEvent;

