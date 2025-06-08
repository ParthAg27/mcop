/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.feature.AbstractFeature
 */
const Clock = require('../util/Clock');
const Logger = require('../util/Logger');

class AbstractFeature {
    constructor() {
        this.bot = null;
        this.timer = new Clock();
        this.failsafesToIgnore = [];
        this.enabled = false;
    }

    // Abstract method - must be implemented by subclasses
    getName() {
        throw new Error('AbstractFeature.getName() must be implemented by subclass');
    }

    /**
     * Returns whether the feature is currently running.
     * This is determined by the internal 'enabled' flag,
     * which is toggled through start, stop, pause, and resume logic.
     *
     * IMPORTANT: This is different from isEnabled()
     *
     * @return true if the feature is active and running
     */
    isRunning() {
        return this.enabled;
    }

    /**
     * Indicates whether the feature is marked as enabled by config or default logic.
     * IMPORTANT: This is independent of whether it is currently running.
     *
     * @return true if the feature is considered enabled
     */
    isEnabled() {
        return true;
    }

    /**
     * Starts the feature. Should be overridden by subclasses
     * to initialize or enable feature-specific logic.
     * NOTE: This does NOT automatically set 'enabled' to true.
     */
    start() {
        // Override in subclass
    }

    /**
     * Stops the feature and resets internal state.
     * This also disables the feature by setting 'enabled' to false.
     */
    stop() {
        this.enabled = false;
        this.resetStatesAfterStop();
    }

    /**
     * Temporarily disables the feature without resetting internal state.
     * Can be resumed later with resume().
     */
    pause() {
        this.enabled = false;
    }

    /**
     * Resumes a paused feature by setting 'enabled' to true.
     */
    resume() {
        this.enabled = true;
    }

    /**
     * Override this method to clean up or reset custom states when the feature stops.
     */
    resetStatesAfterStop() {
        // Override in subclass
    }

    /**
     * Determines whether this feature should auto-start on application launch.
     *
     * @return true if the feature should start automatically
     */
    shouldStartAtLaunch() {
        return false;
    }

    /**
     * Indicates if failsafe checks should be skipped for this feature.
     *
     * @return true to bypass failsafe logic
     */
    shouldNotCheckForFailsafe() {
        return false;
    }

    /**
     * Checks whether the internal timer is currently running
     * and has not yet completed its duration.
     *
     * @return true if the timer is scheduled and still in progress
     */
    isTimerRunning() {
        return this.timer.isScheduled() && !this.timer.passed();
    }

    /**
     * Checks whether the internal timer is scheduled and has completed.
     *
     * @return true if the timer is scheduled and has elapsed
     */
    hasTimerEnded() {
        return this.timer.isScheduled() && this.timer.passed();
    }

    // Event handlers - can be overridden by subclasses
    onTick(event) {
        // Override in subclass
    }

    onRender(event) {
        // Override in subclass
    }

    onChat(message) {
        // Override in subclass
    }

    onTablistUpdate(event) {
        // Override in subclass
    }

    onOverlayRender(event) {
        // Override in subclass
    }

    onPacketReceive(event) {
        // Override in subclass
    }

    onWorldLoad(event) {
        // Override in subclass
    }

    onWorldUnload(event) {
        // Override in subclass
    }

    onBlockChange(event) {
        // Override in subclass
    }

    onBlockDestroy(event) {
        // Override in subclass
    }

    onKeyEvent(event) {
        // Override in subclass
    }

    // Logging methods
    log(message) {
        Logger.sendLog(this.formatMessage(message));
    }

    send(message) {
        Logger.sendMessage(this.formatMessage(message));
    }

    logError(message) {
        Logger.sendLog(this.formatMessage("Error: " + message));
    }

    sendError(message) {
        Logger.sendError(this.formatMessage(message));
    }

    warn(message) {
        Logger.sendWarning(this.formatMessage(message));
    }

    note(message) {
        Logger.sendNote(this.formatMessage(message));
    }

    formatMessage(message) {
        return `[${this.getName()}] ${message}`;
    }

    // Getters and setters
    getFailsafesToIgnore() {
        return this.failsafesToIgnore;
    }

    setBot(bot) {
        this.bot = bot;
    }
}

module.exports = AbstractFeature;

