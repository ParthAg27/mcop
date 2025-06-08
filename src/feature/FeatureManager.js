/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.feature.FeatureManager
 */
const AbstractFeature = require('./AbstractFeature');

class FeatureManager {
    static instance = null;
    
    constructor() {
        this.allFeatures = new Set();
        this.bot = null;
        this.initializeFeatures();
        FeatureManager.instance = this;
    }
    
    static getInstance() {
        if (!FeatureManager.instance) {
            new FeatureManager();
        }
        return FeatureManager.instance;
    }
    
    initializeFeatures() {
        // Will add features as we implement them
        // For now, initialize empty set
        // this.allFeatures.add(AutoCommissionClaim.getInstance());
        // this.allFeatures.add(AutoInventory.getInstance());
        // this.allFeatures.add(AutoMobKiller.getInstance());
        // this.allFeatures.add(AutoWarp.getInstance());
        // this.allFeatures.add(BlockMiner.getInstance());
        // this.allFeatures.add(MouseUngrab.getInstance());
        // this.allFeatures.add(Pathfinder.getInstance());
        // this.allFeatures.add(RouteBuilder.getInstance());
        // this.allFeatures.add(RouteNavigator.getInstance());
        // this.allFeatures.add(AutoDrillRefuel.getInstance());
        // this.allFeatures.add(AutoChestUnlocker.getInstance());
        // this.allFeatures.add(WorldScanner.getInstance());
        // this.allFeatures.add(AutoSell.getInstance());
    }
    
    setBot(bot) {
        this.bot = bot;
        // Set bot reference for all features
        this.allFeatures.forEach(feature => {
            if (feature.setBot) {
                feature.setBot(bot);
            }
        });
    }
    
    enableAll() {
        this.allFeatures.forEach(feature => {
            if (feature.shouldStartAtLaunch()) {
                feature.start();
            }
        });
    }
    
    disableAll() {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning()) {
                feature.stop();
            }
        });
    }
    
    pauseAll() {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning()) {
                feature.pause();
            }
        });
    }
    
    resumeAll() {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning()) {
                feature.resume();
            }
        });
    }
    
    shouldNotCheckForFailsafe() {
        for (const feature of this.allFeatures) {
            if (feature.isRunning() && feature.shouldNotCheckForFailsafe()) {
                return true;
            }
        }
        return false;
    }
    
    getFailsafesToIgnore() {
        const failsafes = new Set();
        this.allFeatures.forEach(feature => {
            if (feature.isRunning()) {
                const featureFailsafes = feature.getFailsafesToIgnore();
                featureFailsafes.forEach(failsafe => failsafes.add(failsafe));
            }
        });
        return failsafes;
    }
    
    // Register a new feature
    registerFeature(feature) {
        if (feature instanceof AbstractFeature) {
            this.allFeatures.add(feature);
            if (this.bot && feature.setBot) {
                feature.setBot(this.bot);
            }
        } else {
            throw new Error('Feature must extend AbstractFeature');
        }
    }
    
    // Unregister a feature
    unregisterFeature(feature) {
        this.allFeatures.delete(feature);
    }
    
    // Get all running features
    getRunningFeatures() {
        return Array.from(this.allFeatures).filter(feature => feature.isRunning());
    }
    
    // Get all enabled features
    getEnabledFeatures() {
        return Array.from(this.allFeatures).filter(feature => feature.isEnabled());
    }
    
    // Event forwarding methods for features
    onTick(event) {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning() && feature.onTick) {
                try {
                    feature.onTick(event);
                } catch (error) {
                    console.error(`Error in feature ${feature.getName()}: ${error.message}`);
                }
            }
        });
    }
    
    onChat(message) {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning() && feature.onChat) {
                try {
                    feature.onChat(message);
                } catch (error) {
                    console.error(`Error in feature ${feature.getName()}: ${error.message}`);
                }
            }
        });
    }
    
    onPacketReceive(event) {
        this.allFeatures.forEach(feature => {
            if (feature.isRunning() && feature.onPacketReceive) {
                try {
                    feature.onPacketReceive(event);
                } catch (error) {
                    console.error(`Error in feature ${feature.getName()}: ${error.message}`);
                }
            }
        });
    }
    
    onWorldLoad(event) {
        this.allFeatures.forEach(feature => {
            if (feature.onWorldLoad) {
                try {
                    feature.onWorldLoad(event);
                } catch (error) {
                    console.error(`Error in feature ${feature.getName()}: ${error.message}`);
                }
            }
        });
    }
    
    onWorldUnload(event) {
        this.allFeatures.forEach(feature => {
            if (feature.onWorldUnload) {
                try {
                    feature.onWorldUnload(event);
                } catch (error) {
                    console.error(`Error in feature ${feature.getName()}: ${error.message}`);
                }
            }
        });
    }
}

module.exports = FeatureManager;

