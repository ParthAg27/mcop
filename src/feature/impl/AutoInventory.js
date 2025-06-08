const AbstractFeature = require('../AbstractFeature');
const InventoryUtil = require('../../util/InventoryUtil');
const PlayerUtil = require('../../util/PlayerUtil');
const Logger = require('../../core/Logger');

class AutoInventory extends AbstractFeature {
    constructor() {
        super('AutoInventory');
        this.logger = new Logger('AutoInventory');
        this.lastStatsTime = 0;
        this.statsInterval = 60000; // 1 minute between stats retrieval
        this.requiredItems = [
            'Pickaxe', 'Drill', 'Gauntlet', // Mining tools
            'ASPECT_OF_THE_END', 'ASPECT_OF_THE_VOID', // Movement items
            'Booster Cookie', // Buffs
            'Mining Gem'
        ];
        this.state = 'IDLE';
        this.currentItemIndex = 0;
        this.retrievalAttempts = 0;
        this.maxAttempts = 3;
    }

    onEnable() {
        super.onEnable();
        this.logger.info('AutoInventory enabled - Will manage tools and retrieve stats');
        this.state = 'CHECKING_TOOLS';
    }

    onDisable() {
        super.onDisable();
        this.logger.info('AutoInventory disabled');
        this.state = 'IDLE';
    }

    shouldTrigger() {
        if (!this.isEnabled()) return false;
        
        // Check if we need to retrieve stats
        const now = Date.now();
        if (now - this.lastStatsTime > this.statsInterval) {
            return true;
        }
        
        // Check if we need tools
        return this.needsTools();
    }

    needsTools() {
        const inventoryUtil = new InventoryUtil(this.bot);
        const missingTools = inventoryUtil.getMissingItemsInHotbar(this.requiredItems);
        return missingTools.length > 0;
    }

    async execute() {
        if (!this.shouldTrigger()) return;
        
        try {
            switch (this.state) {
                case 'CHECKING_TOOLS':
                    await this.checkAndRetrieveTools();
                    break;
                    
                case 'RETRIEVING_STATS':
                    await this.retrieveStats();
                    break;
                    
                case 'ORGANIZING_INVENTORY':
                    await this.organizeInventory();
                    break;
                    
                case 'COMPLETED':
                    this.state = 'IDLE';
                    this.lastStatsTime = Date.now();
                    break;
                    
                default:
                    this.state = 'CHECKING_TOOLS';
                    break;
            }
        } catch (error) {
            this.logger.error(`Error in AutoInventory execution: ${error.message}`);
            this.state = 'IDLE';
        }
    }

    async checkAndRetrieveTools() {
        this.logger.info('Checking required tools in hotbar...');
        
        const inventoryUtil = new InventoryUtil(this.bot);
        const missingTools = inventoryUtil.getMissingItemsInHotbar(this.requiredItems);
        
        if (missingTools.length > 0) {
            this.logger.info(`Missing tools: ${missingTools.join(', ')}`);
            await this.moveToolsToHotbar(missingTools);
        } else {
            this.logger.info('All required tools are in hotbar');
            this.state = 'RETRIEVING_STATS';
        }
    }

    async moveToolsToHotbar(missingTools) {
        const inventoryUtil = new InventoryUtil(this.bot);
        
        for (const tool of missingTools) {
            const foundItem = inventoryUtil.findItemInInventory(tool);
            if (foundItem) {
                // Find available hotbar slot
                const availableSlots = inventoryUtil.getAvailableHotbarSlots([tool]);
                if (availableSlots.slotsToMoveTo.length > 0) {
                    const targetSlot = availableSlots.slotsToMoveTo[0];
                    await inventoryUtil.swapSlots(foundItem.slot, targetSlot);
                    this.logger.info(`Moved ${tool} to hotbar slot ${targetSlot}`);
                    await this.sleep(200);
                }
            } else {
                this.logger.warn(`Tool ${tool} not found in inventory`);
            }
        }
        
        this.state = 'RETRIEVING_STATS';
    }

    async retrieveStats() {
        this.logger.info('Retrieving mining stats...');
        
        try {
            // Open stats menu via SkyBlock menu
            await this.bot.chat('/sbmenu');
            await this.sleep(1000);
            
            // Navigate to stats (this would need specific slot clicking)
            // For now, we'll simulate stats retrieval
            await this.openStatsMenu();
            await this.sleep(2000);
            
            // Parse stats from scoreboard or GUI
            await this.parseStatsFromGUI();
            
            // Close GUI
            const inventoryUtil = new InventoryUtil(this.bot);
            await inventoryUtil.closeScreen();
            
            this.state = 'ORGANIZING_INVENTORY';
            
        } catch (error) {
            this.logger.error(`Failed to retrieve stats: ${error.message}`);
            this.retrievalAttempts++;
            
            if (this.retrievalAttempts >= this.maxAttempts) {
                this.logger.error('Max retrieval attempts reached, skipping stats');
                this.state = 'ORGANIZING_INVENTORY';
                this.retrievalAttempts = 0;
            }
        }
    }

    async openStatsMenu() {
        // This would involve clicking specific GUI slots
        // Implementation depends on the exact SkyBlock menu structure
        const inventoryUtil = new InventoryUtil(this.bot);
        
        // Look for stats item in the SkyBlock menu
        const statsSlot = inventoryUtil.getSlotIdOfItemInContainer('Stats');
        if (statsSlot !== -1) {
            await inventoryUtil.clickContainerSlot(statsSlot);
            await this.sleep(500);
        }
    }

    async parseStatsFromGUI() {
        // Parse mining stats from the current GUI
        // This would read mining level, powder, etc.
        const inventoryUtil = new InventoryUtil(this.bot);
        
        if (this.bot.currentWindow) {
            const slots = this.bot.currentWindow.slots;
            for (let i = 0; i < slots.length; i++) {
                const item = slots[i];
                if (item && item.displayName) {
                    const name = inventoryUtil.stripControlCodes(item.displayName);
                    
                    // Parse mining level
                    if (name.includes('Mining')) {
                        this.parseMiningLevel(item);
                    }
                    
                    // Parse powder amounts
                    if (name.includes('Powder')) {
                        this.parsePowderAmount(item);
                    }
                    
                    // Parse other relevant stats
                    if (name.includes('Commission')) {
                        this.parseCommissionInfo(item);
                    }
                }
            }
        }
        
        this.logger.info('Stats parsing completed');
    }

    parseMiningLevel(item) {
        // Extract mining level from item lore
        if (item.nbt && item.nbt.value && item.nbt.value.display && item.nbt.value.display.value.Lore) {
            const lore = item.nbt.value.display.value.Lore.value.value;
            for (const line of lore) {
                const cleanLine = this.stripControlCodes(line);
                const levelMatch = cleanLine.match(/Level: (\d+)/);
                if (levelMatch) {
                    const level = parseInt(levelMatch[1]);
                    this.logger.info(`Current Mining Level: ${level}`);
                    // Store level for use by other components
                    this.bot.miningLevel = level;
                    break;
                }
            }
        }
    }

    parsePowderAmount(item) {
        // Extract powder amounts from item lore
        if (item.nbt && item.nbt.value && item.nbt.value.display && item.nbt.value.display.value.Lore) {
            const lore = item.nbt.value.display.value.Lore.value.value;
            for (const line of lore) {
                const cleanLine = this.stripControlCodes(line);
                const powderMatch = cleanLine.match(/(\w+) Powder: ([\d,]+)/);
                if (powderMatch) {
                    const powderType = powderMatch[1];
                    const amount = parseInt(powderMatch[2].replace(/,/g, ''));
                    this.logger.info(`${powderType} Powder: ${amount}`);
                    
                    // Store powder amounts
                    if (!this.bot.powderAmounts) this.bot.powderAmounts = {};
                    this.bot.powderAmounts[powderType] = amount;
                }
            }
        }
    }

    parseCommissionInfo(item) {
        // Extract commission information
        if (item.nbt && item.nbt.value && item.nbt.value.display && item.nbt.value.display.value.Lore) {
            const lore = item.nbt.value.display.value.Lore.value.value;
            for (const line of lore) {
                const cleanLine = this.stripControlCodes(line);
                if (cleanLine.includes('Commission Slots')) {
                    const slotsMatch = cleanLine.match(/(\d+)\/(\d+)/);
                    if (slotsMatch) {
                        const usedSlots = parseInt(slotsMatch[1]);
                        const totalSlots = parseInt(slotsMatch[2]);
                        this.logger.info(`Commission Slots: ${usedSlots}/${totalSlots}`);
                        
                        // Store commission info
                        this.bot.commissionSlots = { used: usedSlots, total: totalSlots };
                    }
                }
            }
        }
    }

    async organizeInventory() {
        this.logger.info('Organizing inventory...');
        
        const inventoryUtil = new InventoryUtil(this.bot);
        
        // Ensure pickaxe is in hand
        await this.equipBestPickaxe();
        
        // Move important items to specific hotbar slots
        await this.organizeHotbar();
        
        // Clean up unwanted items
        await this.dropUnwantedItems();
        
        this.state = 'COMPLETED';
    }

    async equipBestPickaxe() {
        const inventoryUtil = new InventoryUtil(this.bot);
        const pickaxe = inventoryUtil.getPickaxe();
        
        if (pickaxe) {
            await inventoryUtil.equipItem(pickaxe.name);
            this.logger.info(`Equipped ${pickaxe.name}`);
        } else {
            this.logger.warn('No pickaxe found in inventory!');
        }
    }

    async organizeHotbar() {
        // Organize hotbar with specific item placements
        const itemPlacements = {
            0: ['Pickaxe', 'Drill', 'Gauntlet'], // Mining tool in slot 0
            1: ['ASPECT_OF_THE_END', 'ASPECT_OF_THE_VOID'], // Movement item in slot 1
            2: ['Booster Cookie'], // Buffs in slot 2
            8: ['Warp'] // Warp items in slot 8
        };
        
        const inventoryUtil = new InventoryUtil(this.bot);
        
        for (const [slot, items] of Object.entries(itemPlacements)) {
            for (const item of items) {
                const foundItem = inventoryUtil.findItemInInventory(item);
                if (foundItem) {
                    await inventoryUtil.swapSlots(foundItem.slot, parseInt(slot) + 36);
                    this.logger.info(`Moved ${item} to hotbar slot ${slot}`);
                    await this.sleep(200);
                    break; // Only place the first found item
                }
            }
        }
    }

    async dropUnwantedItems() {
        const unwantedItems = [
            'Cobblestone',
            'Stone',
            'Andesite',
            'Granite',
            'Diorite',
            'Flint',
            'Gravel'
        ];
        
        const inventoryUtil = new InventoryUtil(this.bot);
        
        for (const unwanted of unwantedItems) {
            const items = inventoryUtil.findAllItemsInInventory(unwanted);
            for (const item of items) {
                await inventoryUtil.dropItem(item.item.name);
                this.logger.info(`Dropped ${item.item.name}`);
                await this.sleep(100);
            }
        }
    }

    stripControlCodes(text) {
        if (!text) return '';
        return text.replace(/§[0-9a-fk-or]/g, '').replace(/[\u00A7\u001B]\[[0-9;]*m/g, '');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Getters for stats (for use by other components)
    getMiningLevel() {
        return this.bot.miningLevel || 0;
    }

    getPowderAmount(type) {
        if (!this.bot.powderAmounts) return 0;
        return this.bot.powderAmounts[type] || 0;
    }

    getCommissionSlots() {
        return this.bot.commissionSlots || { used: 0, total: 5 };
    }

    hasRequiredTools() {
        const inventoryUtil = new InventoryUtil(this.bot);
        return inventoryUtil.areItemsInHotbar(this.requiredItems);
    }

    // Static methods for external access
    static async retrieveStatsOnce(bot) {
        const autoInventory = new AutoInventory();
        autoInventory.bot = bot;
        autoInventory.state = 'RETRIEVING_STATS';
        await autoInventory.execute();
        return {
            miningLevel: autoInventory.getMiningLevel(),
            powderAmounts: bot.powderAmounts || {},
            commissionSlots: autoInventory.getCommissionSlots()
        };
    }

    static async organizeInventoryOnce(bot) {
        const autoInventory = new AutoInventory();
        autoInventory.bot = bot;
        autoInventory.state = 'ORGANIZING_INVENTORY';
        await autoInventory.execute();
    }
}

module.exports = AutoInventory;

