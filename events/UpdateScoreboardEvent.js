const { EventEmitter } = require('events');

/**
 * Event fired when the scoreboard is updated
 * 1:1 replica of UpdateScoreboardEvent.java
 */
class UpdateScoreboardEvent extends EventEmitter {
    constructor(scoreboard, lines) {
        super();
        this.scoreboard = scoreboard;
        this.lines = lines || [];
        this.timestamp = Date.now();
        this.cancelled = false;
    }

    /**
     * Get the updated scoreboard
     * @returns {Object}
     */
    getScoreboard() {
        return this.scoreboard;
    }

    /**
     * Get all scoreboard lines
     * @returns {Array<string>}
     */
    getLines() {
        return this.lines;
    }

    /**
     * Get a specific line by index
     * @param {number} index
     * @returns {string|null}
     */
    getLine(index) {
        return this.lines[index] || null;
    }

    /**
     * Get the number of lines
     * @returns {number}
     */
    getLineCount() {
        return this.lines.length;
    }

    /**
     * Check if the scoreboard contains a specific text
     * @param {string} text
     * @returns {boolean}
     */
    contains(text) {
        return this.lines.some(line => line.includes(text));
    }

    /**
     * Find lines containing specific text
     * @param {string} text
     * @returns {Array<string>}
     */
    findLines(text) {
        return this.lines.filter(line => line.includes(text));
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
        return `UpdateScoreboardEvent{lines=${this.lines.length}}`;
    }
}

module.exports = UpdateScoreboardEvent;

