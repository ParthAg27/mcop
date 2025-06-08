/**
 * UpdateScoreboardEvent
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.event.UpdateScoreboardEvent
 * Fired when the scoreboard is updated
 */
class UpdateScoreboardEvent {
    constructor(objective, playerName, score, line) {
        this.objective = objective;
        this.playerName = playerName;
        this.score = score;
        this.line = line;
        this.cancelled = false;
    }

    /**
     * Gets the scoreboard objective
     * @return Objective name
     */
    getObjective() {
        return this.objective;
    }

    /**
     * Gets the player name associated with the score
     * @return Player name
     */
    getPlayerName() {
        return this.playerName;
    }

    /**
     * Gets the score value
     * @return Score number
     */
    getScore() {
        return this.score;
    }

    /**
     * Gets the display line text
     * @return Line text
     */
    getLine() {
        return this.line;
    }

    /**
     * Sets the display line text
     * @param line New line text
     */
    setLine(line) {
        this.line = line;
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
     * String representation of the event
     * @return String description
     */
    toString() {
        return `UpdateScoreboardEvent{objective=${this.objective}, player=${this.playerName}, score=${this.score}, line='${this.line}'}`;
    }
}

module.exports = UpdateScoreboardEvent;

