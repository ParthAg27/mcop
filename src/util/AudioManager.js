/**
 * AudioManager - Audio notification and sound management
 * Perfect 1:1 replica of Java AudioManager.java
 */

const Logger = require('./Logger');
const path = require('path');
const fs = require('fs');

// Import audio playing library (cross-platform)
let playAudio = null;
try {
    // Try different audio libraries based on platform
    if (process.platform === 'win32') {
        // Windows - use powershell or node-wav-player
        try {
            playAudio = require('node-wav-player');
        } catch (e) {
            // Fallback to system command
            playAudio = null;
        }
    } else {
        // Linux/Mac - use aplay/afplay or similar
        playAudio = null;
    }
} catch (error) {
    Logger.warn('[AudioManager] No audio library available, using system commands');
}

class AudioManager {
    static instance = null;
    
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.soundsPath = path.join(process.cwd(), 'sounds');
        this.sounds = new Map();
        
        // Predefined sound types
        this.soundTypes = {
            NOTIFICATION: 'notification.wav',
            WARNING: 'warning.wav',
            ERROR: 'error.wav',
            SUCCESS: 'success.wav',
            MINE_COMPLETE: 'mine_complete.wav',
            PLAYER_DETECTED: 'player_detected.wav',
            FAILSAFE_TRIGGERED: 'failsafe_triggered.wav',
            MACRO_STOPPED: 'macro_stopped.wav',
            TELEPORT: 'teleport.wav',
            INVENTORY_FULL: 'inventory_full.wav'
        };
        
        this.loadSounds();
    }
    
    static getInstance() {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }
    
    /**
     * Load sound files from sounds directory
     */
    loadSounds() {
        try {
            if (!fs.existsSync(this.soundsPath)) {
                fs.mkdirSync(this.soundsPath, { recursive: true });
                Logger.info('[AudioManager] Created sounds directory');
                this.createDefaultSounds();
                return;
            }
            
            const soundFiles = fs.readdirSync(this.soundsPath)
                .filter(file => file.endsWith('.wav') || file.endsWith('.mp3'));
            
            for (const file of soundFiles) {
                const filePath = path.join(this.soundsPath, file);
                this.sounds.set(file, filePath);
            }
            
            Logger.info(`[AudioManager] Loaded ${soundFiles.length} sound files`);
        } catch (error) {
            Logger.error(`[AudioManager] Error loading sounds: ${error.message}`);
        }
    }
    
    /**
     * Create default sound files (placeholder)
     */
    createDefaultSounds() {
        // Create placeholder sound files or download default sounds
        const defaultSounds = Object.values(this.soundTypes);
        
        for (const soundFile of defaultSounds) {
            const filePath = path.join(this.soundsPath, soundFile);
            if (!fs.existsSync(filePath)) {
                // Create empty file as placeholder
                fs.writeFileSync(filePath, '');
            }
        }
        
        Logger.info('[AudioManager] Created default sound placeholders');
    }
    
    /**
     * Play a notification sound
     * @param {string} soundType - Type of sound to play
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    playNotification(soundType = 'NOTIFICATION', volume = null) {
        if (!this.enabled) {
            return;
        }
        
        try {
            const soundFile = this.soundTypes[soundType] || soundType;
            this.playSound(soundFile, volume);
        } catch (error) {
            Logger.error(`[AudioManager] Error playing notification: ${error.message}`);
        }
    }
    
    /**
     * Play a specific sound file
     * @param {string} soundFile - Sound file name or path
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    playSound(soundFile, volume = null) {
        if (!this.enabled) {
            return;
        }
        
        try {
            const vol = volume || this.volume;
            let soundPath;
            
            // Check if it's a full path or just filename
            if (path.isAbsolute(soundFile)) {
                soundPath = soundFile;
            } else {
                soundPath = this.sounds.get(soundFile) || path.join(this.soundsPath, soundFile);
            }
            
            if (!fs.existsSync(soundPath)) {
                Logger.warn(`[AudioManager] Sound file not found: ${soundPath}`);
                this.playSystemSound();
                return;
            }
            
            this.playAudioFile(soundPath, vol);
        } catch (error) {
            Logger.error(`[AudioManager] Error playing sound: ${error.message}`);
            this.playSystemSound();
        }
    }
    
    /**
     * Play audio file using available method
     * @param {string} filePath - Path to audio file
     * @param {number} volume - Volume level
     */
    playAudioFile(filePath, volume) {
        if (playAudio && typeof playAudio.play === 'function') {
            // Use audio library
            playAudio.play({
                path: filePath,
                volume: volume
            }).catch(error => {
                Logger.error(`[AudioManager] Audio library error: ${error.message}`);
                this.playSystemAudio(filePath, volume);
            });
        } else {
            // Use system command
            this.playSystemAudio(filePath, volume);
        }
    }
    
    /**
     * Play audio using system command
     * @param {string} filePath - Path to audio file
     * @param {number} volume - Volume level
     */
    playSystemAudio(filePath, volume) {
        const { spawn } = require('child_process');
        
        try {
            let command, args;
            
            if (process.platform === 'win32') {
                // Windows - use PowerShell
                command = 'powershell';
                args = [
                    '-c',
                    `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`
                ];
            } else if (process.platform === 'darwin') {
                // macOS - use afplay
                command = 'afplay';
                args = [filePath, '-v', volume.toString()];
            } else {
                // Linux - use aplay or paplay
                command = 'aplay';
                args = [filePath];
            }
            
            const audioProcess = spawn(command, args, {
                stdio: 'ignore',
                detached: true
            });
            
            audioProcess.unref();
            
            audioProcess.on('error', (error) => {
                Logger.warn(`[AudioManager] System audio error: ${error.message}`);
                this.playSystemSound();
            });
        } catch (error) {
            Logger.error(`[AudioManager] System audio command error: ${error.message}`);
            this.playSystemSound();
        }
    }
    
    /**
     * Play system beep/notification sound
     */
    playSystemSound() {
        try {
            // Use console bell character as fallback
            process.stdout.write('\x07');
        } catch (error) {
            // Silent fallback
        }
    }
    
    /**
     * Play success notification
     */
    playSuccess() {
        this.playNotification('SUCCESS');
    }
    
    /**
     * Play warning notification
     */
    playWarning() {
        this.playNotification('WARNING');
    }
    
    /**
     * Play error notification
     */
    playError() {
        this.playNotification('ERROR');
    }
    
    /**
     * Play player detected alert
     */
    playPlayerDetected() {
        this.playNotification('PLAYER_DETECTED');
    }
    
    /**
     * Play failsafe triggered alert
     */
    playFailsafe() {
        this.playNotification('FAILSAFE_TRIGGERED');
    }
    
    /**
     * Play mining complete notification
     */
    playMineComplete() {
        this.playNotification('MINE_COMPLETE');
    }
    
    /**
     * Play inventory full notification
     */
    playInventoryFull() {
        this.playNotification('INVENTORY_FULL');
    }
    
    /**
     * Enable audio notifications
     */
    enable() {
        this.enabled = true;
        Logger.info('[AudioManager] Audio notifications enabled');
    }
    
    /**
     * Disable audio notifications
     */
    disable() {
        this.enabled = false;
        Logger.info('[AudioManager] Audio notifications disabled');
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Logger.info(`[AudioManager] Volume set to ${this.volume}`);
    }
    
    /**
     * Get current volume
     * @returns {number} - Current volume level
     */
    getVolume() {
        return this.volume;
    }
    
    /**
     * Check if audio is enabled
     * @returns {boolean} - True if enabled
     */
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * Get available sound types
     * @returns {Object} - Sound types mapping
     */
    getSoundTypes() {
        return { ...this.soundTypes };
    }
    
    /**
     * Add custom sound
     * @param {string} name - Sound name
     * @param {string} filePath - Path to sound file
     */
    addSound(name, filePath) {
        if (fs.existsSync(filePath)) {
            this.sounds.set(name, filePath);
            Logger.info(`[AudioManager] Added custom sound: ${name}`);
        } else {
            Logger.warn(`[AudioManager] Sound file not found: ${filePath}`);
        }
    }
    
    /**
     * Remove custom sound
     * @param {string} name - Sound name to remove
     */
    removeSound(name) {
        if (this.sounds.has(name)) {
            this.sounds.delete(name);
            Logger.info(`[AudioManager] Removed sound: ${name}`);
        }
    }
    
    /**
     * Get loaded sounds list
     * @returns {Array<string>} - List of sound names
     */
    getLoadedSounds() {
        return Array.from(this.sounds.keys());
    }
}

module.exports = AudioManager;

