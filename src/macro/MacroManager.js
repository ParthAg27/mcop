/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.macro.MacroManager
 */
const MightyMinerConfig = require('../config/MightyMinerConfig');
const Logger = require('../util/Logger');

class MacroManager {
    static instance = null;
    
    constructor() {
        this.currentMacro = null;
        this.bot = null;
        this.config = null;
        
        // Import macros (will be implemented as we create them)
        this.CommissionMacro = null;
        this.GlacialMacro = null;
        this.MiningMacro = require('./impl/MiningMacro');
        this.RouteMinerMacro = null;
        this.GemstonePowderMacro = null;
        
        MacroManager.instance = this;
    }
    
    static getInstance() {
        if (!MacroManager.instance) {
            new MacroManager();
        }
        return MacroManager.instance;
    }
    
    setBot(bot) {
        this.bot = bot;
        this.config = MightyMinerConfig.getInstance();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        if (!this.bot) return;
        
        // Client tick equivalent - using mineflayer's physicsTick
        this.bot.on('physicsTick', () => {
            this.onTick();
        });
        
        // Chat events
        this.bot.on('messagestr', (message) => {
            this.onChat(message);
        });
        
        // Packet events (will be implemented when needed)
        this.bot._client.on('packet', (data, meta) => {
            this.onPacketReceive({ data, meta });
        });
    }
    
    getCurrentMacro() {
        if (!this.config) return null;
        
        switch (this.config.macroType) {
            case 1:
                return this.GlacialMacro?.getInstance();
            case 2:
                return this.MiningMacro.getInstance();
            case 3:
                return this.RouteMinerMacro?.getInstance();
            case 4:
                return this.GemstonePowderMacro?.getInstance();
            default:
                return this.CommissionMacro?.getInstance();
        }
    }
    
    toggle() {
        this.log("Toggling");
        if (this.currentMacro != null) {
            this.log("CurrMacro != null");
            this.disable();
        } else {
            this.log("CurrMacro == null");
            this.enable();
        }
    }
    
    enable() {
        try {
            this.log("Macro::enable");
            
            // Enable all features (FeatureManager equivalent)
            this.enableAllFeatures();
            
            this.currentMacro = this.getCurrentMacro();
            if (this.currentMacro != null) {
                this.send(this.currentMacro.getName() + " Enabled");
                this.currentMacro.setBot(this.bot);
                this.currentMacro.enable();
            } else {
                this.error("Failed to get macro instance");
            }
        } catch (error) {
            this.error("Error enabling macro: " + error.message);
            console.error(error);
        }
    }
    
    disable() {
        try {
            if (this.currentMacro == null) {
                return;
            }
            
            this.log("Macro::disable");
            
            // Safely disable features
            try {
                this.disableAllFeatures();
            } catch (error) {
                this.error("Error disabling features: " + error.message);
            }
            
            // Safely regrab mouse (equivalent to MouseUngrab)
            try {
                this.regrabMouse();
            } catch (error) {
                this.error("Error regrabbing mouse: " + error.message);
            }
            
            // Safely disable current macro
            try {
                const macroName = this.currentMacro.getName();
                this.currentMacro.disable();
                this.send(macroName + " Disabled");
            } catch (error) {
                this.error("Error disabling macro: " + error.message);
            } finally {
                this.currentMacro = null;
            }
        } catch (error) {
            this.error("Unexpected error during disable: " + error.message);
            console.error(error);
            // Force clear macro reference
            this.currentMacro = null;
        }
    }
    
    pause() {
        try {
            if (this.currentMacro == null) {
                return;
            }
            this.log("Macro::pause");
            const macroName = this.currentMacro.getName();
            this.currentMacro.pause();
            this.send(macroName + " Paused");
        } catch (error) {
            this.error("Error pausing macro: " + error.message);
        }
    }
    
    resume() {
        try {
            if (this.currentMacro == null) {
                return;
            }
            this.log("Macro::resume");
            const macroName = this.currentMacro.getName();
            this.currentMacro.resume();
            this.send(macroName + " Resumed");
        } catch (error) {
            this.error("Error resuming macro: " + error.message);
        }
    }
    
    isEnabled() {
        return this.currentMacro != null;
    }
    
    isRunning() {
        return this.currentMacro != null && this.currentMacro.isEnabled();
    }
    
    // Event handlers
    onTick() {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null) {
                return;
            }
            
            // Check if macro is still enabled
            if (!this.currentMacro.isEnabled()) {
                this.disable();
                return;
            }
            
            this.currentMacro.onTick({ phase: 'START' });
        } catch (error) {
            this.error("Error in macro tick: " + error.message);
            console.error(error);
            // Try to disable safely if error occurs
            try {
                this.disable();
            } catch (disableError) {
                this.error("Error during emergency disable: " + disableError.message);
            }
        }
    }
    
    onChat(message) {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null || !message) {
                return;
            }
            
            this.currentMacro.onChat(message);
        } catch (error) {
            this.error("Error handling chat event: " + error.message);
        }
    }
    
    onTablistUpdate(event) {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null || !event) {
                return;
            }
            
            this.currentMacro.onTablistUpdate(event);
        } catch (error) {
            this.error("Error handling tablist update: " + error.message);
        }
    }
    
    onRender(event) {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null || !event) {
                return;
            }
            
            this.currentMacro.onWorldRender(event);
        } catch (error) {
            this.error("Error handling render event: " + error.message);
        }
    }
    
    onOverlayRender(event) {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null || !event) {
                return;
            }
            
            this.currentMacro.onOverlayRender(event);
        } catch (error) {
            this.error("Error handling overlay render: " + error.message);
        }
    }
    
    onPacketReceive(event) {
        try {
            if (!this.bot || !this.bot.entity || this.currentMacro == null || !event) {
                return;
            }
            
            this.currentMacro.onReceivePacket(event);
        } catch (error) {
            this.error("Error handling packet receive: " + error.message);
        }
    }
    
    // Helper methods
    enableAllFeatures() {
        // Will implement FeatureManager equivalent
        this.log("Enabling all features");
    }
    
    disableAllFeatures() {
        // Will implement FeatureManager equivalent
        this.log("Disabling all features");
    }
    
    regrabMouse() {
        // Mouse ungrab equivalent - not needed in headless bot
        this.log("Mouse regrab (not applicable in headless mode)");
    }
    
    // Logging methods
    log(message) {
        Logger.sendLog(this.getMessage(message));
    }
    
    send(message) {
        Logger.sendMessage(this.getMessage(message));
    }
    
    error(message) {
        Logger.sendError(this.getMessage(message));
    }
    
    warn(message) {
        Logger.sendWarning(this.getMessage(message));
    }
    
    getMessage(message) {
        return "[MacroHandler] " + message;
    }
    
    // Macro registration methods
    registerMacro(name, macroClass) {
        this[name] = macroClass;
        this.log(`Registered macro: ${name}`);
    }
}

module.exports = MacroManager;

