/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.hud.CommissionHUD
 * Displays commission information and mining statistics
 */
const Logger = require('../util/Logger');
const ScoreboardUtil = require('../util/ScoreboardUtil');
const CommissionUtil = require('../util/CommissionUtil');

class CommissionHUD {
    constructor() {
        this.enabled = true;
        this.x = 10;
        this.y = 10;
        this.scale = 1.0;
        this.commission = null;
        this.progress = 0;
        this.timeRemaining = 0;
        this.earnings = 0;
        this.totalEarnings = 0;
        this.lastUpdate = Date.now();
    }
    
    // EXACT replica of update from Java
    update(bot) {
        if (!this.enabled || !bot) return;
        
        try {
            // Update commission data from scoreboard
            const scoreboardData = ScoreboardUtil.getScoreboardData(bot);
            this.updateCommissionData(scoreboardData);
            
            // Update progress tracking
            this.updateProgress(bot);
            
            // Update earnings tracking
            this.updateEarnings(bot);
            
            this.lastUpdate = Date.now();
        } catch (error) {
            Logger.sendWarning(`CommissionHUD update error: ${error.message}`);
        }
    }
    
    // EXACT replica of updateCommissionData from Java
    updateCommissionData(scoreboardData) {
        if (!scoreboardData) return;
        
        try {
            // Parse commission type and progress from scoreboard
            const commissionLines = scoreboardData.filter(line => 
                line && (line.includes('Commission:') || line.includes('Progress:'))
            );
            
            if (commissionLines.length > 0) {
                this.commission = CommissionUtil.parseCommissionType(commissionLines[0]);
                
                const progressLine = commissionLines.find(line => line.includes('Progress:'));
                if (progressLine) {
                    this.progress = CommissionUtil.parseProgress(progressLine);
                }
            }
        } catch (error) {
            Logger.sendDebug(`Commission data parsing error: ${error.message}`);
        }
    }
    
    // EXACT replica of updateProgress from Java
    updateProgress(bot) {
        if (!bot || !this.commission) return;
        
        try {
            // Calculate completion percentage
            const targetAmount = this.commission.target || 1000;
            const currentAmount = this.commission.current || 0;
            
            this.progress = Math.min(100, (currentAmount / targetAmount) * 100);
            
            // Estimate time remaining based on current rate
            if (currentAmount > 0 && this.progress < 100) {
                const timeElapsed = (Date.now() - this.commission.startTime) / 1000;
                const rate = currentAmount / timeElapsed;
                const remaining = targetAmount - currentAmount;
                this.timeRemaining = remaining / rate;
            }
        } catch (error) {
            Logger.sendDebug(`Progress calculation error: ${error.message}`);
        }
    }
    
    // EXACT replica of updateEarnings from Java
    updateEarnings(bot) {
        if (!bot) return;
        
        try {
            // Track earnings from purse/wallet changes
            const currentPurse = this.getCurrentPurse(bot);
            if (currentPurse > this.previousPurse) {
                const earned = currentPurse - this.previousPurse;
                this.earnings += earned;
                this.totalEarnings += earned;
            }
            this.previousPurse = currentPurse;
        } catch (error) {
            Logger.sendDebug(`Earnings tracking error: ${error.message}`);
        }
    }
    
    getCurrentPurse(bot) {
        try {
            const scoreboardData = ScoreboardUtil.getScoreboardData(bot);
            const purseLine = scoreboardData.find(line => 
                line && (line.includes('Purse:') || line.includes('Coins:'))
            );
            
            if (purseLine) {
                const match = purseLine.match(/[\d,]+/);
                return match ? parseInt(match[0].replace(/,/g, '')) : 0;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }
    
    // EXACT replica of render from Java (adapted for console output)
    render() {
        if (!this.enabled) return;
        
        try {
            const hudData = this.getHUDData();
            
            // Output to console (in Java this would render to screen)
            if (hudData.commission) {
                console.log(`\n=== COMMISSION HUD ===`);
                console.log(`Commission: ${hudData.commission}`);
                console.log(`Progress: ${hudData.progress.toFixed(1)}%`);
                console.log(`Time Remaining: ${this.formatTime(hudData.timeRemaining)}`);
                console.log(`Session Earnings: ${hudData.earnings.toLocaleString()} coins`);
                console.log(`Total Earnings: ${hudData.totalEarnings.toLocaleString()} coins`);
                console.log(`===================\n`);
            }
        } catch (error) {
            Logger.sendDebug(`HUD render error: ${error.message}`);
        }
    }
    
    getHUDData() {
        return {
            commission: this.commission?.name || 'None',
            progress: this.progress,
            timeRemaining: this.timeRemaining,
            earnings: this.earnings,
            totalEarnings: this.totalEarnings
        };
    }
    
    formatTime(seconds) {
        if (!seconds || seconds <= 0) return '∞';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    // Configuration methods
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    setScale(scale) {
        this.scale = Math.max(0.1, Math.min(3.0, scale));
    }
    
    reset() {
        this.commission = null;
        this.progress = 0;
        this.timeRemaining = 0;
        this.earnings = 0;
        // Don't reset totalEarnings - persist across sessions
    }
}

module.exports = CommissionHUD;

