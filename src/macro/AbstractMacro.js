/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.macro.AbstractMacro
 */
const Clock = require('../util/Clock');
const Logger = require('../util/Logger');

class AbstractMacro {
    constructor() {
        this.timer = new Clock();
        this.uptime = new Clock();
        this.enabled = false;
        this.bot = null; // Will be set by MacroManager
    }

    // Abstract method - must be implemented by subclasses
    getName() {
        throw new Error('AbstractMacro.getName() must be implemented by subclass');
    }

    enable() {
        this.log('AbstractMacro::enable');
        this.onEnable();
        this.uptime.start(this.getCommissionHUD()?.commHudResetStats || false);
        this.enabled = true;
    }

    disable(reason = null) {
        if (reason) {
            this.error(reason);
        }
        this.log('AbstractMacro::disable');
        this.uptime.stop(this.getCommissionHUD()?.commHudResetStats || false);
        this.enabled = false;
        this.onDisable();
    }

    pause() {
        this.log('AbstractMacro::pause');
        this.uptime.stop(false);
        this.enabled = false;
        this.onPause();
    }

    resume() {
        this.log('AbstractMacro::resume');
        this.onResume();
        this.uptime.start(false);
        this.enabled = true;
    }

    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    // Abstract method - must be implemented by subclasses
    getNecessaryItems() {
        throw new Error('AbstractMacro.getNecessaryItems() must be implemented by subclass');
    }

    hasTimerEnded() {
        return this.timer.isScheduled() && this.timer.passed();
    }

    isTimerRunning() {
        return this.timer.isScheduled() && !this.timer.passed();
    }

    isEnabled() {
        return this.enabled;
    }

    // Event handlers - can be overridden by subclasses
    onEnable() {
        // Override in subclass
    }

    onDisable() {
        // Override in subclass
    }

    onPause() {
        // Override in subclass
    }

    onResume() {
        // Override in subclass
    }

    onTick(event) {
        // Override in subclass
    }

    onWorldRender(event) {
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

    onReceivePacket(event) {
        // Override in subclass
    }

    // Logging methods
    log(message) {
        Logger.sendLog(this.formatMessage(message));
    }

    send(message) {
        Logger.sendMessage(this.formatMessage(message));
    }

    error(message) {
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

    // Helper method to get CommissionHUD (will be implemented when HUD is created)
    getCommissionHUD() {
        // Will be implemented when CommissionHUD is created
        return { commHudResetStats: false };
    }

    // Set bot reference
    setBot(bot) {
        this.bot = bot;
    }
}

module.exports = AbstractMacro;

