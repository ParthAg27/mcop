const { EventEmitter } = require('events');
const Logger = require('../src/Logger');

// Import all event types
const BlockChangeEvent = require('./BlockChangeEvent');
const BlockDestroyEvent = require('./BlockDestroyEvent');
const MotionUpdateEvent = require('./MotionUpdateEvent');
const PacketEvent = require('./PacketEvent');
const SpawnParticleEvent = require('./SpawnParticleEvent');
const UpdateEntityEvent = require('./UpdateEntityEvent');
const UpdateScoreboardEvent = require('./UpdateScoreboardEvent');
const UpdateTablistEvent = require('./UpdateTablistEvent');

/**
 * Central event management system
 * Handles all MightyMiner events with proper lifecycle management
 * 1:1 replica of EventManager functionality
 */
class EventManager extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('EventManager');
        this.eventListeners = new Map();
        this.eventQueue = [];
        this.processing = false;
        this.enabled = true;
        
        // Event statistics
        this.stats = {
            totalEvents: 0,
            eventsPerType: new Map(),
            lastEventTime: 0
        };
        
        this.logger.info('EventManager initialized');
    }

    /**
     * Register an event listener
     * @param {string} eventType 
     * @param {Function} listener 
     * @param {number} priority
     */
    registerListener(eventType, listener, priority = 0) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        
        const listeners = this.eventListeners.get(eventType);
        listeners.push({ listener, priority });
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);
        
        this.logger.debug(`Registered listener for ${eventType} with priority ${priority}`);
    }

    /**
     * Unregister an event listener
     * @param {string} eventType 
     * @param {Function} listener 
     */
    unregisterListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) return;
        
        const listeners = this.eventListeners.get(eventType);
        const index = listeners.findIndex(l => l.listener === listener);
        
        if (index !== -1) {
            listeners.splice(index, 1);
            this.logger.debug(`Unregistered listener for ${eventType}`);
        }
    }

    /**
     * Fire an event to all registered listeners
     * @param {Object} event 
     */
    async fireEvent(event) {
        if (!this.enabled) return;
        
        const eventType = event.constructor.name;
        this.updateStats(eventType);
        
        // Add to queue for processing
        this.eventQueue.push(event);
        
        if (!this.processing) {
            await this.processEventQueue();
        }
    }

    /**
     * Process the event queue
     */
    async processEventQueue() {
        this.processing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            await this.processEvent(event);
        }
        
        this.processing = false;
    }

    /**
     * Process a single event
     * @param {Object} event 
     */
    async processEvent(event) {
        const eventType = event.constructor.name;
        const listeners = this.eventListeners.get(eventType) || [];
        
        for (const { listener } of listeners) {
            try {
                if (event.isCancelled && event.isCancelled()) {
                    break; // Stop processing if event is cancelled
                }
                
                await listener(event);
            } catch (error) {
                this.logger.error(`Error in event listener for ${eventType}:`, error);
            }
        }
    }

    /**
     * Update event statistics
     * @param {string} eventType 
     */
    updateStats(eventType) {
        this.stats.totalEvents++;
        this.stats.lastEventTime = Date.now();
        
        if (!this.stats.eventsPerType.has(eventType)) {
            this.stats.eventsPerType.set(eventType, 0);
        }
        
        this.stats.eventsPerType.set(eventType, 
            this.stats.eventsPerType.get(eventType) + 1);
    }

    /**
     * Get event statistics
     * @returns {Object}
     */
    getStats() {
        return {
            totalEvents: this.stats.totalEvents,
            eventsPerType: Object.fromEntries(this.stats.eventsPerType),
            lastEventTime: this.stats.lastEventTime,
            queueSize: this.eventQueue.length,
            processing: this.processing
        };
    }

    /**
     * Clear all event listeners
     */
    clearListeners() {
        this.eventListeners.clear();
        this.logger.info('Cleared all event listeners');
    }

    /**
     * Enable/disable event processing
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Event processing ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if event manager is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Clear event queue
     */
    clearQueue() {
        this.eventQueue.length = 0;
        this.logger.debug('Cleared event queue');
    }

    /**
     * Get the number of listeners for an event type
     * @param {string} eventType 
     * @returns {number}
     */
    getListenerCount(eventType) {
        return this.eventListeners.has(eventType) ? 
            this.eventListeners.get(eventType).length : 0;
    }

    /**
     * Shutdown the event manager
     */
    shutdown() {
        this.setEnabled(false);
        this.clearListeners();
        this.clearQueue();
        this.logger.info('EventManager shutdown complete');
    }
}

// Export event classes and manager
module.exports = {
    EventManager,
    BlockChangeEvent,
    BlockDestroyEvent,
    MotionUpdateEvent,
    PacketEvent,
    SpawnParticleEvent,
    UpdateEntityEvent,
    UpdateScoreboardEvent,
    UpdateTablistEvent
};

