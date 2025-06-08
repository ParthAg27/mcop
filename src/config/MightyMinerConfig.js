/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.config.MightyMinerConfig
 */
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../util/Logger');

class MightyMinerConfig {
    static instance = null;
    
    constructor() {
        this.configPath = path.join(__dirname, '../../config/MightMinerV2.7/config.json');
        this.initializeDefaults();
        this.load();
        MightyMinerConfig.instance = this;
    }
    
    static getInstance() {
        if (!MightyMinerConfig.instance) {
            new MightyMinerConfig();
        }
        return MightyMinerConfig.instance;
    }
    
    initializeDefaults() {
        // GENERAL
        this.macroType = 0; // 0=Commission, 1=Glacial, 2=Mining, 3=Route, 4=Powder
        this.toggleMacro = 96; // Grave key (backtick)
        this.miningTool = "";
        this.altMiningTool = "";
        this.drillSwap = false;
        this.sneakWhileMining = false;
        this.usePickaxeAbility = true;
        this.precisionMiner = false;
        this.oreRespawnWaitThreshold = 5;
        this.drillRefuel = false;
        this.refuelMachineFuel = 1; // 0=Volta, 1=Oil Barrel
        this.ungrabMouse = false;
        this.muteGame = true;
        this.miscFullBlock = false;
        
        // COMMISSION
        this.commClaimMethod = 0; // 0=NPC, 1=Royal Pigeon
        this.slayerWeapon = "";
        this.mobKillerSprint = true;
        this.mobKillerInterpolate = true;
        
        // MINING MACRO
        this.oreType = 0; // 0=Mithril, 1=Diamond, 2=Emerald, 3=Redstone, 4=Lapis, 5=Gold, 6=Iron, 7=Coal
        this.mineGrayMithril = false;
        
        // ROUTE MINER
        this.routeMinerType = 0;
        
        // POWDER
        this.powderMacroType = 0;
        
        // DELAYS
        this.rotationSpeed = 10;
        this.walkingSpeed = 10;
        this.miningDelay = 50;
        this.rotationDelay = 50;
        this.clickDelay = 50;
        this.switchDelay = 200;
        this.teleportDelay = 3000;
        this.warpDelay = 5000;
        this.chestDelay = 200;
        this.slotDelay = 200;
        this.sellDelay = 200;
        this.npcDelay = 200;
        this.auctionDelay = 200;
        this.bazaarDelay = 200;
        this.commissionClaimDelay = 500;
        this.commissionCompleteDelay = 1000;
        
        // AUTO SELL
        this.autoSellEnabled = false;
        this.sellMethod = 0; // 0=NPC, 1=Bazaar
        this.sellPrice = 1000;
        
        // FAILSAFE
        this.failsafeEnabled = true;
        this.playerFailsafe = true;
        this.bedrockFailsafe = true;
        this.rotationFailsafe = true;
        this.worldChangeFailsafe = true;
        this.teleportFailsafe = true;
        this.disconnectFailsafe = true;
        this.itemChangeFailsafe = true;
        this.knockbackFailsafe = true;
        this.badEffectFailsafe = true;
        this.profileFailsafe = true;
        this.slotChangeFailsafe = true;
        
        // DEBUG
        this.debugMode = false;
        this.debugBlocks = false;
        this.debugPath = false;
        this.debugRotation = false;
        this.debugFailsafe = false;
        
        // DISCORD INTEGRATION
        this.discordEnabled = false;
        this.discordWebhook = "";
        this.discordPingOnStart = true;
        this.discordPingOnStop = true;
        this.discordPingOnFailsafe = true;
    }
    
    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readJsonSync(this.configPath);
                Object.assign(this, data);
                Logger.sendLog("Config loaded successfully");
            } else {
                this.save(); // Create default config
                Logger.sendLog("Created default config");
            }
        } catch (error) {
            Logger.sendError(`Failed to load config: ${error.message}`);
            this.save(); // Save defaults on error
        }
    }
    
    save() {
        try {
            fs.ensureDirSync(path.dirname(this.configPath));
            fs.writeJsonSync(this.configPath, this, { spaces: 2 });
            Logger.sendLog("Config saved successfully");
        } catch (error) {
            Logger.sendError(`Failed to save config: ${error.message}`);
        }
    }
    
    // Getters for macro types (exactly matching Java enum behavior)
    getMacroTypeString() {
        const types = ["Commission", "Glacial Commissions", "Mining Macro", "Route Miner", "Gemstone Powder"];
        return types[this.macroType] || "Commission";
    }
    
    getOreTypeString() {
        const ores = ["Mithril", "Diamond", "Emerald", "Redstone", "Lapis", "Gold", "Iron", "Coal"];
        return ores[this.oreType] || "Mithril";
    }
    
    getClaimMethodString() {
        const methods = ["NPC", "Royal Pigeon"];
        return methods[this.commClaimMethod] || "NPC";
    }
    
    getSellMethodString() {
        const methods = ["NPC", "Bazaar"];
        return methods[this.sellMethod] || "NPC";
    }
    
    // Tool setters (matching Java button behavior)
    setMiningTool(itemName) {
        if (!itemName || itemName.trim() === '') {
            Logger.sendMessage("Don't hold an empty hand.");
            return;
        }
        this.miningTool = itemName;
        Logger.sendMessage(`Mining Tool set to: ${itemName}`);
        this.save();
    }
    
    setAltMiningTool(itemName) {
        if (!itemName || itemName.trim() === '') {
            Logger.sendMessage("Don't hold an empty hand.");
            return;
        }
        this.altMiningTool = itemName;
        Logger.sendMessage(`Alternative Mining Tool set to: ${itemName}`);
        this.save();
    }
    
    setSlayerWeapon(itemName) {
        if (!itemName || itemName.trim() === '') {
            Logger.sendMessage("Don't hold an empty hand.");
            return;
        }
        this.slayerWeapon = itemName.replace(/[^\x20-\x7E]/g, ""); // Strip non-ASCII
        Logger.sendMessage(`Slayer Weapon set to: ${itemName}`);
        this.save();
    }
}

module.exports = MightyMinerConfig;

