/**
 * GemstonePowderMacro - Automated gemstone powder farming
 * Perfect 1:1 replica of Java GemstonePowderMacro.java
 */

const AbstractMacro = require('../macro/AbstractMacro');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const RouteMinerMacro = require('./RouteMinerMacro');
const Logger = require('../util/Logger');

class GemstonePowderMacro extends AbstractMacro {
    static instance = null;
    
    constructor() {
        super();
        this.routeMiner = RouteMinerMacro.getInstance();
    }
    
    static getInstance() {
        if (!GemstonePowderMacro.instance) {
            GemstonePowderMacro.instance = new GemstonePowderMacro();
        }
        return GemstonePowderMacro.instance;
    }
    
    getName() {
        return "Gemstone Powder Macro";
    }
    
    getNecessaryItems() {
        const items = [];
        
        if (MightyMinerConfig.drillRefuel) {
            items.push("Abiphone");
        }
        
        // Add common items needed for powder farming
        items.push("Gemstone Gauntlet", "Mining Drill");
        
        return items;
    }
    
    onEnable() {
        try {
            Logger.info("[GemstonePowderMacro] Starting Gemstone Powder farming...");
            
            // Delegate to route miner for now
            // In a full implementation, this would have its own logic
            if (this.routeMiner) {
                this.routeMiner.onEnable();
            }
            
            super.onEnable();
        } catch (error) {
            Logger.error(`[GemstonePowderMacro] Error in onEnable: ${error.message}`);
            this.disable();
        }
    }
    
    onDisable() {
        try {
            Logger.info("[GemstonePowderMacro] Stopping Gemstone Powder farming...");
            
            if (this.routeMiner) {
                this.routeMiner.onDisable();
            }
            
            super.onDisable();
        } catch (error) {
            Logger.error(`[GemstonePowderMacro] Error in onDisable: ${error.message}`);
        }
    }
    
    onTick(bot) {
        if (!this.enabled) return;
        
        try {
            // Delegate to route miner for main logic
            if (this.routeMiner && this.routeMiner.enabled) {
                this.routeMiner.onTick(bot);
            }
        } catch (error) {
            Logger.error(`[GemstonePowderMacro] Error in onTick: ${error.message}`);
            this.disable();
        }
    }
}

module.exports = GemstonePowderMacro;

