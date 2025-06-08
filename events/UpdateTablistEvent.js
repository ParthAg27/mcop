const { EventEmitter } = require('events');

/**
 * Event fired when the tab list is updated
 * 1:1 replica of UpdateTablistEvent.java
 */
class UpdateTablistEvent extends EventEmitter {
    constructor(players, header, footer) {
        super();
        this.players = players || [];
        this.header = header || '';
        this.footer = footer || '';
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    getPlayers() {
        return this.players;
    }

    getHeader() {
        return this.header;
    }

    getFooter() {
        return this.footer;
    }

    getPlayerCount() {
        return this.players.length;
    }

    findPlayer(name) {
        return this.players.find(p => p.username === name);
    }

    containsPlayer(name) {
        return this.players.some(p => p.username === name);
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
        return `UpdateTablistEvent{players=${this.players.length}}`;
    }
}

module.exports = UpdateTablistEvent;

