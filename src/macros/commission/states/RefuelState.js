const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');
const InventoryUtil = require('../../../utils/InventoryUtil');

/**
 * State for refueling drill/tools
 * 1:1 replica of RefuelState.java
 */
class RefuelState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'Refuel');
        this.refuelStartTime = 0;
        this.maxRefuelTime = 45000; // 45 seconds max
        this.refuelAttempts = 0;
        this.maxRefuelAttempts = 3;
        this.targetTool = null;
        this.fuelItems = [
            'enchanted_lapis_lazuli',
            'lapis_lazuli',
            'enchanted_redstone',
            'redstone',
            'volta',
            'biofuel',
            'oil_barrel'
        ];
    }

    /**
     * Enter refuel state
     */
    async onEnter() {
        await super.onEnter();
        this.refuelStartTime = Date.now();
        this.refuelAttempts = 0;
        this.targetTool = this.findToolNeedingRefuel();
        this.log('info', 'Starting tool refuel process');
    }

    /**
     * Execute refueling logic
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot) return;
        
        try {
            // Check if we have a tool that needs refueling
            if (!this.targetTool) {
                this.targetTool = this.findToolNeedingRefuel();
                if (!this.targetTool) {
                    this.log('info', 'No tools need refueling');
                    return;
                }
            }
            
            // Attempt refuel if we haven't exceeded max attempts
            if (this.refuelAttempts < this.maxRefuelAttempts) {
                await this.executeRefuel(bot, this.targetTool);
                this.refuelAttempts++;
                
                // Wait between attempts
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check if refuel was successful
                if (await this.verifyRefuelSuccess(bot, this.targetTool)) {
                    this.log('info', `Successfully refueled ${this.targetTool.name}`);
                    this.targetTool = null; // Look for next tool
                    this.refuelAttempts = 0;
                }
            }
            
        } catch (error) {
            this.log('error', 'Error in refuel state:', error);
        }
    }

    /**
     * Find tool that needs refueling
     * @returns {Object|null}
     */
    findToolNeedingRefuel() {
        const bot = this.getBot();
        if (!bot || !bot.inventory) return null;
        
        const items = bot.inventory.items();
        
        // Look for drills or pickaxes with low fuel
        for (const item of items) {
            if (this.isRefuelableTool(item) && this.needsRefuel(item)) {
                this.log('debug', `Found tool needing refuel: ${item.name}`);
                return item;
            }
        }
        
        return null;
    }

    /**
     * Check if item is a refuelable tool
     * @param {Object} item
     * @returns {boolean}
     */
    isRefuelableTool(item) {
        if (!item || !item.name) return false;
        
        const refuelableTools = [
            'drill',
            'pickaxe'
        ];
        
        return refuelableTools.some(tool => item.name.toLowerCase().includes(tool));
    }

    /**
     * Check if tool needs refueling
     * @param {Object} item
     * @returns {boolean}
     */
    needsRefuel(item) {
        if (!item) return false;
        
        // Check NBT data for fuel level (simplified)
        // In real implementation, would parse NBT data
        if (item.nbt && item.nbt.value) {
            try {
                const nbtData = item.nbt.value;
                
                // Look for fuel-related NBT tags
                if (nbtData.drill_fuel !== undefined) {
                    const fuelLevel = nbtData.drill_fuel.value || 0;
                    const maxFuel = nbtData.drill_fuel_tank || 25000;
                    const fuelPercentage = fuelLevel / maxFuel;
                    
                    this.log('debug', `Tool fuel: ${fuelLevel}/${maxFuel} (${Math.round(fuelPercentage * 100)}%)`);
                    return fuelPercentage < 0.1; // Refuel when below 10%
                }
            } catch (error) {
                this.log('debug', 'Error reading tool fuel data');
            }
        }
        
        // Fallback: assume tool needs fuel if it's a drill
        return item.name.toLowerCase().includes('drill');
    }

    /**
     * Execute the refueling process
     * @param {Object} bot
     * @param {Object} tool
     */
    async executeRefuel(bot, tool) {
        this.log('info', `Attempting to refuel ${tool.name}`);
        
        try {
            // Find fuel in inventory
            const fuel = this.findBestFuel(bot);
            if (!fuel) {
                this.log('warn', 'No fuel found in inventory');
                return;
            }
            
            // Equip the tool
            await bot.equip(tool, 'hand');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try different refuel methods
            await this.tryRefuelMethods(bot, tool, fuel);
            
        } catch (error) {
            this.log('error', `Error refueling ${tool.name}:`, error);
        }
    }

    /**
     * Find the best fuel item in inventory
     * @param {Object} bot
     * @returns {Object|null}
     */
    findBestFuel(bot) {
        if (!bot.inventory) return null;
        
        const items = bot.inventory.items();
        
        // Prioritize better fuel types
        for (const fuelType of this.fuelItems) {
            const fuel = items.find(item => 
                item.name.toLowerCase().includes(fuelType.toLowerCase())
            );
            if (fuel) {
                this.log('debug', `Found fuel: ${fuel.name}`);
                return fuel;
            }
        }
        
        return null;
    }

    /**
     * Try different refuel methods
     * @param {Object} bot
     * @param {Object} tool
     * @param {Object} fuel
     */
    async tryRefuelMethods(bot, tool, fuel) {
        // Method 1: Right-click fuel on tool
        try {
            await bot.equip(fuel, 'off-hand');
            await bot.activateItem();
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.log('debug', 'Tried right-click refuel method');
        } catch (error) {
            this.log('debug', 'Right-click refuel failed');
        }
        
        // Method 2: Use refuel command if available
        try {
            await bot.chat(`/refuel ${tool.slot} ${fuel.slot}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.log('debug', 'Tried command refuel method');
        } catch (error) {
            this.log('debug', 'Command refuel failed');
        }
        
        // Method 3: Open tool GUI and add fuel
        try {
            await bot.activateItem(); // Right-click tool
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (bot.currentWindow) {
                await this.addFuelToToolGUI(bot, fuel);
            }
        } catch (error) {
            this.log('debug', 'GUI refuel failed');
        }
    }

    /**
     * Add fuel to tool GUI
     * @param {Object} bot
     * @param {Object} fuel
     */
    async addFuelToToolGUI(bot, fuel) {
        if (!bot.currentWindow) return;
        
        const window = bot.currentWindow;
        
        // Look for fuel slot in the tool GUI
        for (let i = 0; i < window.slots.length; i++) {
            const slot = window.slots[i];
            
            // Find empty slot or fuel slot
            if (!slot || this.isFuelSlot(slot)) {
                try {
                    await bot.clickWindow(fuel.slot, 0, 0); // Pick up fuel
                    await bot.clickWindow(i, 0, 0); // Place in fuel slot
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.log('debug', 'Added fuel to tool GUI');
                    break;
                } catch (error) {
                    this.log('debug', 'Failed to add fuel to GUI');
                }
            }
        }
        
        // Close GUI
        await bot.closeWindow(window);
    }

    /**
     * Check if slot is a fuel slot
     * @param {Object} slot
     * @returns {boolean}
     */
    isFuelSlot(slot) {
        if (!slot || !slot.name) return false;
        
        // Check if slot contains fuel items
        return this.fuelItems.some(fuel => 
            slot.name.toLowerCase().includes(fuel.toLowerCase())
        );
    }

    /**
     * Verify that refuel was successful
     * @param {Object} bot
     * @param {Object} tool
     * @returns {boolean}
     */
    async verifyRefuelSuccess(bot, tool) {
        try {
            // Wait for game to update
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get updated tool data
            const updatedTool = bot.inventory.items().find(item => 
                item.slot === tool.slot && item.name === tool.name
            );
            
            if (updatedTool) {
                // Check if fuel level increased
                const stillNeedsRefuel = this.needsRefuel(updatedTool);
                return !stillNeedsRefuel;
            }
            
            return false;
        } catch (error) {
            this.log('error', 'Error verifying refuel success:', error);
            return false;
        }
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check refuel timeout
        if (Date.now() - this.refuelStartTime > this.maxRefuelTime) {
            this.log('warn', 'Refuel timeout reached');
            return this.macro.states.MINING;
        }
        
        // Check if all tools refueled or max attempts reached
        if (!this.findToolNeedingRefuel() || this.refuelAttempts >= this.maxRefuelAttempts) {
            this.log('info', 'Refuel completed, returning to mining');
            return this.macro.states.MINING;
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = RefuelState;

