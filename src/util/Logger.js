/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.Logger
 */
const fs = require('fs');
const path = require('path');

class Logger {
    static instance = new Logger();
    
    constructor() {
        this.logFile = path.join(__dirname, '../../config/mightyminer.log');
        this.ensureLogDirectory();
    }
    
    static getInstance() {
        return Logger.instance;
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    static sendLog(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [LOG] ${message}`;
        console.log(`\x1b[37m${logMessage}\x1b[0m`); // White
        Logger.getInstance().writeToFile(logMessage);
    }
    
    static sendMessage(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [INFO] ${message}`;
        console.log(`\x1b[32m${logMessage}\x1b[0m`); // Green
        Logger.getInstance().writeToFile(logMessage);
    }
    
    static sendError(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [ERROR] ${message}`;
        console.error(`\x1b[31m${logMessage}\x1b[0m`); // Red
        Logger.getInstance().writeToFile(logMessage);
    }
    
    static sendWarning(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [WARNING] ${message}`;
        console.warn(`\x1b[33m${logMessage}\x1b[0m`); // Yellow
        Logger.getInstance().writeToFile(logMessage);
    }
    
    static sendNote(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [NOTE] ${message}`;
        console.log(`\x1b[36m${logMessage}\x1b[0m`); // Cyan
        Logger.getInstance().writeToFile(logMessage);
    }
    
    static sendNotification(title, message, duration) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [NOTIFICATION] ${title}: ${message} (${duration}ms)`;
        console.log(`\x1b[35m${logMessage}\x1b[0m`); // Magenta
        Logger.getInstance().writeToFile(logMessage);
        
        // Simulate notification behavior (could integrate with system notifications)
        setTimeout(() => {
            // Notification timeout logic if needed
        }, duration);
    }
    
    writeToFile(message) {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
}

module.exports = Logger;

