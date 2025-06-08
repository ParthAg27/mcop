const AbstractFeature = require('./AbstractFeature');
const InventoryUtil = require('../utils/InventoryUtil');
const Logger = require('../Logger');

/**
 * Automatically sells items when inventory is full
 * 1:1 replica of AutoSell.java
 */
class AutoSell extends AbstractFeature {
    constructor() {
        super('AutoSell');
        this.logger = new Logger('AutoSell');
        this.sellThreshold = 30; // Sell when inventory has 30+ items
        this.lastSellTime = 0;
        this.sellCooldown = 10000; // 10 seconds between sells
        this.sellAttempts = 0;
        this.maxSellAttempts = 3;
        
        // Items to sell (configurable)
        this.sellableItems = [
            'cobblestone',
            'stone',
            'coal',
            'iron_ore',
            'gold_ore',
            'diamond',
            'emerald',
            'redstone',
            'lapis_lazuli',
            'mithril',
            'hard_stone',
            'ruby',
            'amber',
            'sapphire',
            'jade',
            'amethyst',
            'topaz',
            'jasper',
            'opal'
        ];
        
        // Items to never sell
        this.protectedItems = [
            'pickaxe',
            'drill',
            'food',
            'potion',
            'key',
            'pass',
            'token',
            'fuel'
        ];
    }

    /**
     * Enable auto sell feature
     */
    onEnable() {
        this.logger.info('AutoSell enabled');
    }

    /**
     * Disable auto sell feature
     */
    onDisable() {
        this.logger.info('AutoSell disabled');
    }

    /**
     * Main auto sell logic
     */
    async onTick() {
        if (!this.enabled || !this.bot) return;
        
        try {
            // Check if we should sell
            if (this.shouldSell()) {
                await this.executeSell();
            }
        } catch (error) {
            this.logger.error('Error in AutoSell tick:', error);
        }
    }

    /**
     * Check if we should sell items
     * @returns {boolean}
     */
    shouldSell() {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastSellTime < this.sellCooldown) {
            return false;
        }
        
        // Check inventory fullness
        if (!this.bot.inventory) return false;
        
        const items = this.bot.inventory.items();
        const sellableCount = this.getSellableItemCount(items);
        
        if (sellableCount >= this.sellThreshold) {
            this.logger.debug(`Inventory has ${sellableCount} sellable items (threshold: ${this.sellThreshold})`);
            return true;
        }
        
        return false;
    }

    /**
     * Get count of sellable items in inventory
     * @param {Array} items
     * @returns {number}
     */
    getSellableItemCount(items) {
        return items.filter(item => this.isSellableItem(item)).length;
    }

    /**
     * Check if an item can be sold
     * @param {Object} item
     * @returns {boolean}
     */
    isSellableItem(item) {
        if (!item || !item.name) return false;
        
        const itemName = item.name.toLowerCase();
        
        // Check if item is protected
        if (this.protectedItems.some(protected => itemName.includes(protected))) {
            return false;
        }
        
        // Check if item is in sellable list
        return this.sellableItems.some(sellable => itemName.includes(sellable));
    }

    /**
     * Execute the selling process
     */
    async executeSell() {
        this.logger.info('Executing auto sell');
        this.lastSellTime = Date.now();
        this.sellAttempts = 0;
        
        try {
            // Try different sell methods
            const success = await this.trySellMethods();
            
            if (success) {
                this.logger.info('Successfully sold items');
                this.sellAttempts = 0;
            } else {
                this.sellAttempts++;
                this.logger.warn(`Sell attempt ${this.sellAttempts} failed`);
            }
            
        } catch (error) {
            this.logger.error('Error executing sell:', error);
            this.sellAttempts++;
        }
    }

    /**
     * Try different methods to sell items
     * @returns {boolean} Success
     */
    async trySellMethods() {
        // Method 1: Use /sell command
        if (await this.trySellCommand()) {
            return true;
        }
        
        // Method 2: Use /sellall command
        if (await this.trySellAllCommand()) {
            return true;
        }
        
        // Method 3: Find and interact with NPC
        if (await this.trySellNPC()) {
            return true;
        }
        
        // Method 4: Use sell GUI
        if (await this.trySellGUI()) {
            return true;
        }
        
        return false;
    }

    /**
     * Try using /sell command
     * @returns {boolean}
     */
    async trySellCommand() {
        try {
            this.logger.debug('Trying /sell command');
            await this.bot.chat('/sell');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        } catch (error) {
            this.logger.debug('/sell command failed');
            return false;
        }
    }

    /**
     * Try using /sellall command
     * @returns {boolean}
     */
    async trySellAllCommand() {
        try {
            this.logger.debug('Trying /sellall command');
            await this.bot.chat('/sellall');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        } catch (error) {
            this.logger.debug('/sellall command failed');
            return false;
        }
    }

    /**
     * Try finding and interacting with sell NPC
     * @returns {boolean}
     */
    async trySellNPC() {
        try {
            this.logger.debug('Looking for sell NPC');
            const npc = this.findSellNPC();
            
            if (npc) {
                await this.bot.lookAt(npc.position);
                await this.bot.activateEntity(npc);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try to interact with sell GUI
                if (this.bot.currentWindow) {
                    await this.interactWithSellGUI();
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            this.logger.debug('NPC sell failed:', error);
            return false;
        }
    }

    /**
     * Find sell NPC
     * @returns {Object|null}
     */
    findSellNPC() {
        const npcs = Object.values(this.bot.entities).filter(entity => 
            entity.type === 'villager' &&
            (entity.name?.toLowerCase().includes('sell') ||
             entity.displayName?.toLowerCase().includes('sell') ||
             entity.name?.toLowerCase().includes('shop') ||
             entity.displayName?.toLowerCase().includes('shop'))
        );
        
        if (npcs.length > 0) {
            // Find closest NPC
            const playerPos = this.bot.entity.position;
            npcs.sort((a, b) => 
                a.position.distanceTo(playerPos) - b.position.distanceTo(playerPos)
            );
            return npcs[0];
        }
        
        return null;
    }

    /**
     * Try using sell GUI
     * @returns {boolean}
     */
    async trySellGUI() {
        try {
            this.logger.debug('Trying sell GUI');
            
            // Look for sell item in inventory
            const sellItem = this.bot.inventory.items().find(item => 
                item.name.toLowerCase().includes('sell') ||
                item.displayName?.toLowerCase().includes('sell')
            );
            
            if (sellItem) {
                await this.bot.equip(sellItem, 'hand');
                await this.bot.activateItem();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (this.bot.currentWindow) {
                    await this.interactWithSellGUI();
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            this.logger.debug('GUI sell failed:', error);
            return false;
        }
    }

    /**
     * Interact with sell GUI window
     */
    async interactWithSellGUI() {
        if (!this.bot.currentWindow) return;
        
        const window = this.bot.currentWindow;
        
        // Look for sell buttons or sell all buttons
        for (let i = 0; i < window.slots.length; i++) {
            const slot = window.slots[i];
            
            if (slot && slot.name) {
                const itemName = slot.name.toLowerCase();
                const displayName = slot.displayName?.toLowerCase() || '';
                
                // Check if this is a sell button
                if (itemName.includes('sell') || 
                    displayName.includes('sell') ||
                    displayName.includes('sell all') ||
                    displayName.includes('quick sell')) {
                    
                    try {
                        await this.bot.clickWindow(i, 0, 0);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        this.logger.debug(`Clicked sell button: ${displayName}`);
                    } catch (error) {
                        this.logger.debug('Failed to click sell button');
                    }
                }
            }
        }
        
        // Close window
        await this.bot.closeWindow(window);
    }

    /**
     * Set sell threshold
     * @param {number} threshold
     */
    setSellThreshold(threshold) {
        this.sellThreshold = threshold;
        this.logger.info(`Sell threshold set to ${threshold}`);
    }

    /**
     * Add item to sellable list
     * @param {string} itemName
     */
    addSellableItem(itemName) {
        if (!this.sellableItems.includes(itemName)) {
            this.sellableItems.push(itemName);
            this.logger.info(`Added ${itemName} to sellable items`);
        }
    }

    /**
     * Remove item from sellable list
     * @param {string} itemName
     */
    removeSellableItem(itemName) {
        const index = this.sellableItems.indexOf(itemName);
        if (index !== -1) {
            this.sellableItems.splice(index, 1);
            this.logger.info(`Removed ${itemName} from sellable items`);
        }
    }

    /**
     * Add item to protected list
     * @param {string} itemName
     */
    addProtectedItem(itemName) {
        if (!this.protectedItems.includes(itemName)) {
            this.protectedItems.push(itemName);
            this.logger.info(`Added ${itemName} to protected items`);
        }
    }

    /**
     * Get feature statistics
     * @returns {Object}
     */
    getStats() {
        return {
            enabled: this.enabled,
            sellThreshold: this.sellThreshold,
            lastSellTime: this.lastSellTime,
            sellAttempts: this.sellAttempts,
            sellableItemCount: this.sellableItems.length,
            protectedItemCount: this.protectedItems.length
        };
    }
}

module.exports = AutoSell;

