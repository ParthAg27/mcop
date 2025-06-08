const { EventEmitter } = require('events');

/**
 * Event fired when entity data is updated
 * 1:1 replica of UpdateEntityEvent.java
 */
class UpdateEntityEvent extends EventEmitter {
    constructor(entity, updateType) {
        super();
        this.entity = entity;
        this.updateType = updateType; // 'position', 'rotation', 'metadata', etc.
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    getEntity() {
        return this.entity;
    }

    getUpdateType() {
        return this.updateType;
    }

    getEntityId() {
        return this.entity ? this.entity.id : null;
    }

    getEntityType() {
        return this.entity ? this.entity.type : null;
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
        return `UpdateEntityEvent{entity=${this.getEntityId()}, type=${this.updateType}}`;
    }
}

module.exports = UpdateEntityEvent;

