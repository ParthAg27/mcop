const { Vec3 } = require('vec3');
const Logger = require('../core/Logger');

class InventoryUtil {
    static bot = null;
    static logger = new Logger('InventoryUtil');

    static init(bot) {
        this.bot = bot;
    }

    static getHeldItem() {
        if (!this.bot) return null;
        return this.bot.heldItem;
    }

    static getHeldItemName() {
        const item = this.getHeldItem();
        return item ? item.name : null;
    }

    static hasItemInHotbar(itemName) {
        if (!this.bot) return false;
        
        for (let i = 0; i < 9; i++) {
            const item = this.bot.inventory.slots[i + 36]; // Hotbar slots 36-44
            if (item && item.name.includes(itemName)) {
                return true;
            }
        }
        return false;
    }

    static getItemInSlot(slot) {
        if (!this.bot) return null;
        return this.bot.inventory.slots[slot];
    }

    static getItemCountInInventory(itemName) {
        if (!this.bot) return 0;
        
        let count = 0;
        for (const item of this.bot.inventory.items()) {
            if (item.name.includes(itemName)) {
                count += item.count;
            }
        }
        return count;
    }

    static hasSpaceInInventory() {
        if (!this.bot) return false;
        
        // Check inventory slots 9-35 (main inventory)
        for (let i = 9; i < 36; i++) {
            if (!this.bot.inventory.slots[i]) {
                return true;
            }
        }
        return false;
    }

    static getEmptySlots() {
        if (!this.bot) return 0;
        
        let emptySlots = 0;
        for (let i = 9; i < 36; i++) {
            if (!this.bot.inventory.slots[i]) {
                emptySlots++;
            }
        }
        return emptySlots;
    }

    static async equipItem(itemName) {
        if (!this.bot) return false;
        
        try {
            const item = this.bot.inventory.items().find(item => 
                item.name.includes(itemName)
            );
            
            if (item) {
                await this.bot.equip(item, 'hand');
                this.logger.info(`Equipped ${item.name}`);
                return true;
            }
        } catch (error) {
            this.logger.error(`Failed to equip ${itemName}: ${error.message}`);
        }
        return false;
    }

    static async dropItem(itemName, count = null) {
        if (!this.bot) return false;
        
        try {
            const item = this.bot.inventory.items().find(item => 
                item.name.includes(itemName)
            );
            
            if (item) {
                const dropCount = count || item.count;
                await this.bot.toss(item.type, null, dropCount);
                this.logger.info(`Dropped ${dropCount}x ${item.name}`);
                return true;
            }
        } catch (error) {
            this.logger.error(`Failed to drop ${itemName}: ${error.message}`);
        }
        return false;
    }

    static async clickSlot(slot, mode = 0, button = 0) {
        if (!this.bot) return false;
        
        try {
            await this.bot.clickWindow(slot, mode, button);
            return true;
        } catch (error) {
            this.logger.error(`Failed to click slot ${slot}: ${error.message}`);
            return false;
        }
    }

    static isInventoryFull() {
        return this.getEmptySlots() === 0;
    }

    static getPickaxe() {
        if (!this.bot) return null;
        
        const pickaxes = this.bot.inventory.items().filter(item => 
            item.name.includes('pickaxe') || 
            item.name.includes('drill') ||
            item.name.includes('gauntlet')
        );
        
        // Return the best pickaxe (usually the first one found)
        return pickaxes.length > 0 ? pickaxes[0] : null;
    }

    static async equipPickaxe() {
        const pickaxe = this.getPickaxe();
        if (pickaxe) {
            return await this.equipItem(pickaxe.name);
        }
        return false;
    }

    static getTotalItemCount() {
        if (!this.bot) return 0;
        
        let total = 0;
        for (let i = 9; i < 36; i++) {
            if (this.bot.inventory.slots[i]) {
                total++;
            }
        }
        return total;
    }

    static async openInventory() {
        if (!this.bot) return false;
        
        try {
            // Open inventory by right-clicking or using key
            await this.bot.chat('/invsee');
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        } catch (error) {
            this.logger.error(`Failed to open inventory: ${error.message}`);
            return false;
        }
    }

    static closeInventory() {
        if (!this.bot) return;
        
        try {
            this.bot.closeWindow(this.bot.currentWindow);
        } catch (error) {
            this.logger.error(`Failed to close inventory: ${error.message}`);
        }
    }

    static hasItem(itemName) {
        return this.getItemCountInInventory(itemName) > 0;
    }

    static getArmorPieces() {
        if (!this.bot) return [];
        
        const armor = [];
        // Helmet, Chestplate, Leggings, Boots (slots 5, 6, 7, 8)
        for (let i = 5; i <= 8; i++) {
            const item = this.bot.inventory.slots[i];
            if (item) {
                armor.push(item);
            }
        }
        return armor;
    }

    static async swapToHotbarSlot(slot) {
        if (!this.bot || slot < 0 || slot > 8) return false;
        
        try {
            this.bot.setQuickBarSlot(slot);
            return true;
        } catch (error) {
            this.logger.error(`Failed to swap to hotbar slot ${slot}: ${error.message}`);
            return false;
        }
    }

    static getCurrentHotbarSlot() {
        return this.bot ? this.bot.quickBarSlot : 0;
    }

    static getItemType(itemName) {
        if (!this.bot) return null;
        
        const item = this.bot.inventory.items().find(item => 
            item.name.includes(itemName)
        );
        
        return item ? item.type : null;
    }

    static async waitForInventoryUpdate(timeout = 5000) {
        if (!this.bot) return false;
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => resolve(false), timeout);
            
            const onUpdate = () => {
                clearTimeout(timeoutId);
                this.bot.removeListener('inventoryUpdate', onUpdate);
                resolve(true);
            };
            
            this.bot.on('inventoryUpdate', onUpdate);
        });
    }

    static logInventoryContents() {
        if (!this.bot) return;
        
        this.logger.info('=== INVENTORY CONTENTS ===');
        
        // Hotbar
        this.logger.info('Hotbar:');
        for (let i = 0; i < 9; i++) {
            const item = this.bot.inventory.slots[i + 36];
            if (item) {
                this.logger.info(`  Slot ${i}: ${item.count}x ${item.name}`);
            }
        }
        
        // Main inventory
        this.logger.info('Main Inventory:');
        for (let i = 9; i < 36; i++) {
            const item = this.bot.inventory.slots[i];
            if (item) {
                this.logger.info(`  Slot ${i}: ${item.count}x ${item.name}`);
            }
        }
        
        // Armor
        this.logger.info('Armor:');
        const armor = this.getArmorPieces();
        armor.forEach((item, index) => {
            const armorNames = ['Boots', 'Leggings', 'Chestplate', 'Helmet'];
            this.logger.info(`  ${armorNames[index]}: ${item.name}`);
        });
        
        this.logger.info('=========================');
    }
}

module.exports = InventoryUtil;

/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.InventoryUtil
 */
class InventoryUtil {
    constructor(bot) {
        this.bot = bot;
    }

    holdItem(item) {
        const slot = this.getHotbarSlotOfItem(item);
        if (slot === -1) {
            return false;
        }
        this.bot.setQuickBarSlot(slot);
        return true;
    }

    getSlotIdOfItemInContainer(item, equals = false) {
        const slot = this.getSlotOfItemInContainer(item, equals);
        return slot ? slot.slot : -1;
    }

    getSlotOfItemInContainer(item, equals = false) {
        if (!this.bot.currentWindow) return null;
        
        const slots = this.bot.currentWindow.slots;
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            if (slot && slot.name) {
                const itemName = this.stripControlCodes(slot.displayName || slot.name);
                if (equals) {
                    if (itemName.toLowerCase() === item.toLowerCase()) {
                        return { slot: i, item: slot };
                    }
                } else {
                    if (itemName.includes(item)) {
                        return { slot: i, item: slot };
                    }
                }
            }
        }
        return null;
    }

    getFirstEmptySlotId() {
        const slot = this.getFirstEmptySlot();
        return slot ? slot.slot : -1;
    }

    getFirstEmptySlot() {
        if (!this.bot.currentWindow) return null;
        
        const slots = this.bot.currentWindow.slots;
        for (let i = 0; i < slots.length; i++) {
            if (!slots[i]) {
                return { slot: i };
            }
        }
        return null;
    }

    getHotbarSlotOfItem(items) {
        if (!items || items.trim() === '') {
            return -1;
        }
        
        for (let i = 0; i < 9; i++) {
            const item = this.bot.inventory.slots[i + 36]; // Hotbar starts at slot 36
            if (!item || !item.displayName) {
                continue;
            }
            
            if (item.displayName.includes(items)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Returns a list of required items that are not present in the player's inventory
     * @param requiredItems Array of item names to check for
     * @return Array of missing item names (empty if all items are present)
     */
    getMissingItemsInInventory(requiredItems) {
        const missingItems = [...requiredItems];
        
        const inventory = this.bot.inventory.slots;
        for (let i = 9; i < 36; i++) { // Main inventory slots
            const item = inventory[i];
            if (item && item.displayName) {
                const displayName = item.displayName;
                // Remove items that are found
                for (let j = missingItems.length - 1; j >= 0; j--) {
                    if (displayName.includes(missingItems[j])) {
                        missingItems.splice(j, 1);
                    }
                }
            }
        }
        
        return missingItems;
    }

    areItemsInInventory(items) {
        return this.getMissingItemsInInventory(items).length === 0;
    }

    /**
     * Returns a list of required items that are not present in the player's hotbar
     * @param requiredItems Array of item names to check for
     * @return Array of missing item names (empty if all items are present)
     */
    getMissingItemsInHotbar(requiredItems) {
        const missingItems = [...requiredItems];
        
        for (let i = 0; i < 9; i++) {
            const item = this.bot.inventory.slots[i + 36]; // Hotbar starts at slot 36
            if (item && item.displayName) {
                // Remove color codes from the display name
                const cleanName = item.displayName.replace(/§[0-9a-fk-or]/g, '');
                // Remove items that are found
                for (let j = missingItems.length - 1; j >= 0; j--) {
                    if (cleanName.includes(missingItems[j])) {
                        missingItems.splice(j, 1);
                    }
                }
            }
        }
        return missingItems;
    }

    areItemsInHotbar(items) {
        return this.getMissingItemsInHotbar(items).length === 0;
    }

    // returns the items that aren't in hotbar and slots that items can be moved into
    getAvailableHotbarSlots(items) {
        const itemsToMove = [...items];
        const slotsToMoveTo = [];

        for (let i = 0; i < 9; i++) {
            const item = this.bot.inventory.slots[i + 36]; // Hotbar starts at slot 36

            if (!item || !item.displayName) {
                slotsToMoveTo.push(i);
            } else {
                // Check if this item matches any required item
                let foundMatch = false;
                for (let j = itemsToMove.length - 1; j >= 0; j--) {
                    if (item.displayName.includes(itemsToMove[j])) {
                        itemsToMove.splice(j, 1);
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch) {
                    slotsToMoveTo.push(i);
                }
            }

            if (itemsToMove.length === 0) {
                break;
            }
        }

        return { slotsToMoveTo, itemsToMove };
    }

    getInventoryName() {
        if (!this.bot.currentWindow) return '';
        return this.bot.currentWindow.title || '';
    }

    async clickContainerSlot(slot, mouseButton = 0, clickMode = 0) {
        if (!this.bot.currentWindow) return false;
        
        try {
            await this.bot.clickWindow(slot, mouseButton, clickMode);
            return true;
        } catch (error) {
            console.error('Failed to click container slot:', error);
            return false;
        }
    }

    async swapSlots(slot, hotbarSlot) {
        try {
            await this.bot.clickWindow(slot, hotbarSlot, 2); // Mode 2 is swap
            return true;
        } catch (error) {
            console.error('Failed to swap slots:', error);
            return false;
        }
    }

    async openInventory() {
        // In mineflayer, we can't open inventory GUI like in client
        // But we can access inventory directly
        return true;
    }

    async closeScreen() {
        if (this.bot.currentWindow) {
            await this.bot.closeWindow(this.bot.currentWindow);
        }
    }

    // Helper methods
    stripControlCodes(text) {
        if (!text) return '';
        return text.replace(/§[0-9a-fk-or]/g, '').replace(/[\u00A7\u001B]\[[0-9;]*m/g, '');
    }

    // Get item in hand
    getItemInHand() {
        const heldItem = this.bot.heldItem;
        return heldItem ? {
            name: heldItem.name,
            displayName: heldItem.displayName,
            count: heldItem.count,
            slot: this.bot.quickBarSlot
        } : null;
    }

    // Find item in inventory by name
    findItemInInventory(itemName, exact = false) {
        const inventory = this.bot.inventory.slots;
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i];
            if (item) {
                const name = this.stripControlCodes(item.displayName || item.name);
                if (exact ? name.toLowerCase() === itemName.toLowerCase() : name.includes(itemName)) {
                    return { slot: i, item };
                }
            }
        }
        return null;
    }

    // Get all items matching a pattern
    findAllItemsInInventory(itemName, exact = false) {
        const results = [];
        const inventory = this.bot.inventory.slots;
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i];
            if (item) {
                const name = this.stripControlCodes(item.displayName || item.name);
                if (exact ? name.toLowerCase() === itemName.toLowerCase() : name.includes(itemName)) {
                    results.push({ slot: i, item });
                }
            }
        }
        return results;
    }

    // Count items in inventory
    countItemsInInventory(itemName, exact = false) {
        let count = 0;
        const inventory = this.bot.inventory.slots;
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i];
            if (item) {
                const name = this.stripControlCodes(item.displayName || item.name);
                if (exact ? name.toLowerCase() === itemName.toLowerCase() : name.includes(itemName)) {
                    count += item.count;
                }
            }
        }
        return count;
    }

    // Static methods for global access
    static getStaticHotbarSlotOfItem(bot, items) {
        const util = new InventoryUtil(bot);
        return util.getHotbarSlotOfItem(items);
    }

    static staticHoldItem(bot, item) {
        const util = new InventoryUtil(bot);
        return util.holdItem(item);
    }

    static staticAreItemsInHotbar(bot, items) {
        const util = new InventoryUtil(bot);
        return util.areItemsInHotbar(items);
    }
}

// Click types enum equivalent
InventoryUtil.ClickType = {
    LEFT: 0,
    RIGHT: 1,
    MIDDLE: 2
};

// Click modes enum equivalent  
InventoryUtil.ClickMode = {
    NORMAL: 0,
    SHIFT: 1,
    HOTBAR: 2,
    PICKUP_ALL: 3,
    DROP: 4,
    QUICK_CRAFT: 5
};

module.exports = InventoryUtil;

