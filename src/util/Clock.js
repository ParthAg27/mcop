/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.helper.Clock
 */
class Clock {
    constructor() {
        this.deltaTime = 0;
        this.paused = false;
        this.scheduled = false;
        this.endTime = 0;
        this.startTime = 0;
    }

    // stopwatch

    schedule(milliseconds) {
        this.endTime = Date.now() + milliseconds;
        this.deltaTime = milliseconds;
        this.scheduled = true;
        this.paused = false;
    }

    passed() {
        return Date.now() >= this.endTime;
    }

    pause() {
        if (this.scheduled && !this.paused) {
            this.deltaTime = this.endTime - Date.now();
            this.paused = true;
        }
    }

    resume() {
        if (this.scheduled && this.paused) {
            this.endTime = Date.now() + this.deltaTime;
            this.paused = false;
        }
    }

    getRemainingTime() {
        if (this.paused) {
            return this.deltaTime;
        }
        return Math.max(0, this.endTime - Date.now());
    }

    // timer

    start(reset) {
        if (!this.scheduled || reset) {
            this.startTime = Date.now();
        } else {
            this.resumeTimer();
        }
        this.scheduled = true;
    }

    stop(reset) {
        if (!this.scheduled || reset) {
            this.reset();
        } else {
            this.pauseTimer();
        }
    }

    getTimePassed() {
        if (!this.scheduled || this.paused) {
            return this.deltaTime;
        }
        return Date.now() - this.startTime;
    }

    pauseTimer() {
        if (this.scheduled && !this.paused) {
            this.deltaTime = Date.now() - this.startTime;
            this.paused = true;
        }
    }

    resumeTimer() {
        if (this.scheduled && this.paused) {
            this.startTime = Date.now() - this.deltaTime;
            this.paused = false;
        }
    }

    reset() {
        this.scheduled = false;
        this.paused = false;
        this.endTime = 0;
        this.deltaTime = 0;
    }

    isScheduled() {
        return this.scheduled;
    }
}

module.exports = Clock;

