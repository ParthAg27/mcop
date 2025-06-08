/**
 * SlotChangeFailsafe - Detects suspicious inventory slot changes
 * Perfect 1:1 replica of Java SlotChangeFailsafe.java
 */

const AbstractFailsafe = require('./AbstractFailsafe');
const MacroManager = require('../src/macro/MacroManager');
const InventoryUtil = require('../src/util/InventoryUtil');
const Logger = require('../src/util/Logger');
const Clock = require('../src/util/Clock');

class SlotChangeFailsafe extends AbstractFailsafe {
    static instance = null;
    
    constructor() {
        super();
        this.lastHeldItem = null;
        this.lastHeldItemSlot = -1;
        this.suspiciousChangeTime = null;
        this.triggerDelay = new Clock();
        this.monitoringEnabled = true;
    }
    
    static getInstance() {
        if (!SlotChangeFailsafe.instance) {
            SlotChangeFailsafe.instance = new SlotChangeFailsafe();
        }
        return SlotChangeFailsafe.instance;
    }
    
    getName() {
        return "SlotChangeFailsafe";
    }
    
    getFailsafeType() {
        return "SLOT_CHANGE";
    }
    
    getPriority() {
        return 6;
    }
    
    onTick(bot) {
        if (!this.monitoringEnabled || !bot || !bot.entity) {
            return false;
        }
        
        try {
            const currentHeldItem = bot.heldItem;
            const currentSlot = bot.quickBarSlot;
            
            // Initialize tracking on first run
            if (this.lastHeldItem === null && this.lastHeldItemSlot === -1) {
                this.lastHeldItem = currentHeldItem;
                this.lastHeldItemSlot = currentSlot;
                return false;
            }
            
            // Check for slot changes
            if (this.hasSlotChanged(currentSlot, currentHeldItem)) {
                if (this.isSuspiciousChange(currentSlot, currentHeldItem, bot)) {
                    if (this.suspiciousChangeTime === null) {
                        this.suspiciousChangeTime = Date.now();
                        this.triggerDelay.schedule(1000); // 1 second delay
                        Logger.warn(`[SlotChangeFailsafe] Suspicious slot change detected: ${this.lastHeldItemSlot} → ${currentSlot}`);
                    }
                } else {
                    // Reset if change seems legitimate
                    this.suspiciousChangeTime = null;
                    this.triggerDelay.reset();
                }
                
                // Update tracking
                this.lastHeldItem = currentHeldItem;
                this.lastHeldItemSlot = currentSlot;
            }
            
            // Check if we should trigger the failsafe
            if (this.suspiciousChangeTime !== null && 
                this.triggerDelay.passed() && 
                this.triggerDelay.isScheduled()) {
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error(`[SlotChangeFailsafe] Error in onTick: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if the held slot has changed
     * @param {number} currentSlot - Current held slot
     * @param {Object} currentItem - Current held item
     * @returns {boolean} - True if slot changed
     */
    hasSlotChanged(currentSlot, currentItem) {
        return currentSlot !== this.lastHeldItemSlot ||
               !this.itemsEqual(currentItem, this.lastHeldItem);
    }
    
    /**
     * Check if the slot change is suspicious
     * @param {number} currentSlot - Current held slot
     * @param {Object} currentItem - Current held item
     * @param {Object} bot - Mineflayer bot instance
     * @returns {boolean} - True if suspicious
     */
    isSuspiciousChange(currentSlot, currentItem, bot) {
        try {
            // Don't trigger if macro is not running
            if (!MacroManager.getInstance().isEnabled()) {
                return false;
            }
            
            // Check if this was a rapid, unexpected change
            const timeSinceLastChange = this.suspiciousChangeTime ? 
                Date.now() - this.suspiciousChangeTime : Infinity;
            
            // If we just detected a suspicious change less than 5 seconds ago, this might be related
            if (timeSinceLastChange < 5000) {
                return true;
            }
            
            // Check if the change seems unnatural (e.g., non-sequential slot changes)
            if (this.isUnexpectedSlotJump(currentSlot)) {
                return true;
            }
            
            // Check if we switched to an empty slot unexpectedly
            if (!currentItem && this.lastHeldItem) {
                Logger.warn(`[SlotChangeFailsafe] Switched to empty slot unexpectedly`);
                return true;
            }
            
            // Check if we switched from a mining tool to something else unexpectedly
            if (this.isMiningTool(this.lastHeldItem) && !this.isMiningTool(currentItem)) {
                Logger.warn(`[SlotChangeFailsafe] Switched from mining tool to non-mining item`);
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error(`[SlotChangeFailsafe] Error in isSuspiciousChange: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if slot change represents an unexpected jump
     * @param {number} currentSlot - Current slot
     * @returns {boolean} - True if unexpected jump
     */
    isUnexpectedSlotJump(currentSlot) {
        // If we jump more than 2 slots away, it might be suspicious
        const slotDifference = Math.abs(currentSlot - this.lastHeldItemSlot);
        return slotDifference > 2 && slotDifference < 7; // Exclude wrap-around (0->8 or 8->0)
    }
    
    /**
     * Check if an item is a mining tool
     * @param {Object} item - Item to check
     * @returns {boolean} - True if mining tool
     */
    isMiningTool(item) {
        if (!item || !item.name) return false;
        
        const miningTools = [
            'diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe', 'golden_pickaxe',
            'drill', 'mining_drill', 'titanium_drill', 'mithril_drill'
        ];
        
        const itemName = item.name.toLowerCase();
        return miningTools.some(tool => itemName.includes(tool));
    }
    
    /**
     * Compare two items for equality
     * @param {Object} item1 - First item
     * @param {Object} item2 - Second item
     * @returns {boolean} - True if equal
     */
    itemsEqual(item1, item2) {
        if (!item1 && !item2) return true;
        if (!item1 || !item2) return false;
        
        return item1.type === item2.type && 
               item1.count === item2.count &&
               JSON.stringify(item1.nbt || {}) === JSON.stringify(item2.nbt || {});
    }
    
    react() {
        try {
            MacroManager.getInstance().disable();
            Logger.sendWarning("Suspicious inventory slot change detected! Disabling macro.");
            
            // Reset tracking
            this.suspiciousChangeTime = null;
            this.triggerDelay.reset();
            
            return true;
        } catch (error) {
            Logger.error(`[SlotChangeFailsafe] Error in react: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Enable or disable monitoring
     * @param {boolean} enabled - Whether to enable monitoring
     */
    setMonitoring(enabled) {
        this.monitoringEnabled = enabled;
        if (!enabled) {
            this.reset();
        }
    }
    
    /**
     * Reset the failsafe state
     */
    reset() {
        this.lastHeldItem = null;
        this.lastHeldItemSlot = -1;
        this.suspiciousChangeTime = null;
        this.triggerDelay.reset();
    }
}

module.exports = SlotChangeFailsafe;

