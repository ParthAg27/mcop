const AbstractFailsafe = require('./AbstractFailsafe');

/**
 * Detects when important items change or disappear from inventory
 * 1:1 replica of ItemChangeFailsafe.java
 */
class ItemChangeFailsafe extends AbstractFailsafe {
    constructor() {
        super('ItemChange', 6); // Medium-high priority
        this.importantItems = new Map(); // slot -> item info
        this.lastInventorySnapshot = new Map();
        this.protectedSlots = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]); // Hotbar slots
        this.checkInterval = 2000; // Check every 2 seconds
        this.lastCheckTime = 0;
        this.itemChanges = [];
        this.maxChangeHistory = 20;
    }

    /**
     * Check for item changes in inventory
     * @param {Object} bot
     * @returns {boolean}
     */
    async shouldTrigger(bot) {
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval) {
            return false;
        }
        
        this.lastCheckTime = now;
        
        if (!bot.inventory) return false;
        
        // Get current inventory state
        const currentInventory = this.getInventorySnapshot(bot);
        
        // Check for important item changes
        const criticalChanges = this.detectCriticalChanges(currentInventory);
        
        if (criticalChanges.length > 0) {
            this.logItemChanges(criticalChanges);
            return true;
        }
        
        // Update last snapshot
        this.lastInventorySnapshot = currentInventory;
        return false;
    }

    /**
     * Handle item change detection
     * @param {Object} bot
     * @returns {boolean}
     */
    async onTrigger(bot) {
        const currentInventory = this.getInventorySnapshot(bot);
        const changes = this.detectAllChanges(this.lastInventorySnapshot, currentInventory);
        
        this.logger.warn(`Item change failsafe triggered - ${changes.length} critical changes detected`);
        
        // Log all changes
        for (const change of changes) {
            this.logger.warn(`Item change: ${change.type} - ${change.description}`);
        }
        
        // Emit item change event
        if (bot.emit) {
            bot.emit('item_change_detected', {
                changes,
                timestamp: Date.now(),
                currentInventory: Array.from(currentInventory.entries())
            });
        }
        
        // Check if we should stop macro based on change severity
        const shouldStop = this.shouldStopMacro(changes);
        
        if (shouldStop) {
            this.logger.error('Critical item changes detected - stopping macro for safety');
        }
        
        return shouldStop;
    }

    /**
     * Get snapshot of current inventory
     * @param {Object} bot
     * @returns {Map}
     */
    getInventorySnapshot(bot) {
        const snapshot = new Map();
        
        if (!bot.inventory) return snapshot;
        
        // Include both hotbar and inventory items
        for (let slot = 0; slot < bot.inventory.slots.length; slot++) {
            const item = bot.inventory.slots[slot];
            if (item) {
                snapshot.set(slot, {
                    type: item.type,
                    name: item.name,
                    displayName: item.displayName,
                    count: item.count,
                    durabilityUsed: item.durabilityUsed,
                    maxDurability: item.maxDurability,
                    slot: slot,
                    nbt: item.nbt ? JSON.stringify(item.nbt) : null
                });
            }
        }
        
        return snapshot;
    }

    /**
     * Detect critical changes that should trigger failsafe
     * @param {Map} currentInventory
     * @returns {Array}
     */
    detectCriticalChanges(currentInventory) {
        const criticalChanges = [];
        
        // Check for missing important items
        for (const [slot, oldItem] of this.lastInventorySnapshot) {
            if (this.isImportantItem(oldItem)) {
                const currentItem = currentInventory.get(slot);
                
                if (!currentItem) {
                    criticalChanges.push({
                        type: 'ITEM_LOST',
                        slot,
                        item: oldItem,
                        description: `Important item lost: ${oldItem.displayName || oldItem.name} from slot ${slot}`
                    });
                }
            }
        }
        
        // Check for tool durability changes
        for (const [slot, oldItem] of this.lastInventorySnapshot) {
            if (this.isTool(oldItem)) {
                const currentItem = currentInventory.get(slot);
                
                if (currentItem && this.isToolBroken(oldItem, currentItem)) {
                    criticalChanges.push({
                        type: 'TOOL_BROKEN',
                        slot,
                        item: currentItem,
                        description: `Tool broken: ${currentItem.displayName || currentItem.name} in slot ${slot}`
                    });
                }
            }
        }
        
        // Check for suspicious item additions (potential hacks/dupes)
        for (const [slot, currentItem] of currentInventory) {
            if (!this.lastInventorySnapshot.has(slot) && this.isValuableItem(currentItem)) {
                criticalChanges.push({
                    type: 'SUSPICIOUS_ADDITION',
                    slot,
                    item: currentItem,
                    description: `Suspicious valuable item appeared: ${currentItem.displayName || currentItem.name} in slot ${slot}`
                });
            }
        }
        
        return criticalChanges;
    }

    /**
     * Detect all changes between inventories
     * @param {Map} oldInventory
     * @param {Map} newInventory
     * @returns {Array}
     */
    detectAllChanges(oldInventory, newInventory) {
        const changes = [];
        const allSlots = new Set([...oldInventory.keys(), ...newInventory.keys()]);
        
        for (const slot of allSlots) {
            const oldItem = oldInventory.get(slot);
            const newItem = newInventory.get(slot);
            
            if (!oldItem && newItem) {
                // Item added
                changes.push({
                    type: 'ITEM_ADDED',
                    slot,
                    item: newItem,
                    description: `Item added: ${newItem.displayName || newItem.name} to slot ${slot}`
                });
            } else if (oldItem && !newItem) {
                // Item removed
                changes.push({
                    type: 'ITEM_REMOVED',
                    slot,
                    item: oldItem,
                    description: `Item removed: ${oldItem.displayName || oldItem.name} from slot ${slot}`
                });
            } else if (oldItem && newItem) {
                // Item changed
                if (oldItem.type !== newItem.type || oldItem.count !== newItem.count) {
                    changes.push({
                        type: 'ITEM_CHANGED',
                        slot,
                        oldItem,
                        newItem,
                        description: `Item changed: ${oldItem.displayName || oldItem.name} -> ${newItem.displayName || newItem.name} in slot ${slot}`
                    });
                }
            }
        }
        
        return changes;
    }

    /**
     * Check if item is considered important
     * @param {Object} item
     * @returns {boolean}
     */
    isImportantItem(item) {
        if (!item) return false;
        
        const importantItems = [
            'pickaxe', 'drill', 'sword', 'bow',
            'key', 'pass', 'token', 'core',
            'artifact', 'relic', 'talisman',
            'pet', 'mount', 'booster'
        ];
        
        const itemName = (item.displayName || item.name || '').toLowerCase();
        return importantItems.some(important => itemName.includes(important));
    }

    /**
     * Check if item is a tool
     * @param {Object} item
     * @returns {boolean}
     */
    isTool(item) {
        if (!item) return false;
        
        const tools = ['pickaxe', 'drill', 'sword', 'axe', 'shovel', 'hoe'];
        const itemName = (item.displayName || item.name || '').toLowerCase();
        return tools.some(tool => itemName.includes(tool));
    }

    /**
     * Check if tool is broken
     * @param {Object} oldItem
     * @param {Object} newItem
     * @returns {boolean}
     */
    isToolBroken(oldItem, newItem) {
        if (!oldItem || !newItem) return false;
        
        // Check if durability went from having durability to 0
        if (oldItem.maxDurability && newItem.maxDurability) {
            const oldDurability = oldItem.maxDurability - (oldItem.durabilityUsed || 0);
            const newDurability = newItem.maxDurability - (newItem.durabilityUsed || 0);
            
            return oldDurability > 0 && newDurability <= 0;
        }
        
        return false;
    }

    /**
     * Check if item is valuable
     * @param {Object} item
     * @returns {boolean}
     */
    isValuableItem(item) {
        if (!item) return false;
        
        const valuableItems = [
            'diamond', 'emerald', 'gold', 'mithril',
            'enchanted', 'legendary', 'mythic', 'special',
            'rare', 'epic', 'pet', 'talisman'
        ];
        
        const itemName = (item.displayName || item.name || '').toLowerCase();
        return valuableItems.some(valuable => itemName.includes(valuable));
    }

    /**
     * Determine if macro should stop based on changes
     * @param {Array} changes
     * @returns {boolean}
     */
    shouldStopMacro(changes) {
        // Stop if any critical changes occurred
        const criticalTypes = ['ITEM_LOST', 'TOOL_BROKEN'];
        
        return changes.some(change => criticalTypes.includes(change.type));
    }

    /**
     * Log item changes
     * @param {Array} changes
     */
    logItemChanges(changes) {
        for (const change of changes) {
            this.itemChanges.push({
                ...change,
                timestamp: Date.now()
            });
        }
        
        // Keep only recent changes
        if (this.itemChanges.length > this.maxChangeHistory) {
            this.itemChanges = this.itemChanges.slice(-this.maxChangeHistory);
        }
    }

    /**
     * Add slot to protected slots
     * @param {number} slot
     */
    addProtectedSlot(slot) {
        this.protectedSlots.add(slot);
        this.logger.info(`Added slot ${slot} to protected slots`);
    }

    /**
     * Remove slot from protected slots
     * @param {number} slot
     */
    removeProtectedSlot(slot) {
        this.protectedSlots.delete(slot);
        this.logger.info(`Removed slot ${slot} from protected slots`);
    }

    /**
     * Get item change statistics
     * @returns {Object}
     */
    getItemChangeStats() {
        return {
            protectedSlots: Array.from(this.protectedSlots),
            recentChanges: this.itemChanges.slice(-10),
            lastCheckTime: this.lastCheckTime,
            checkInterval: this.checkInterval
        };
    }

    /**
     * Reset failsafe state
     */
    reset() {
        super.reset();
        this.importantItems.clear();
        this.lastInventorySnapshot.clear();
        this.itemChanges.length = 0;
        this.lastCheckTime = 0;
    }
}

module.exports = ItemChangeFailsafe;

