const Logger = require('../core/Logger');

/**
 * ScoreboardUtil
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.util.ScoreboardUtil
 * Handles Hypixel Skyblock scoreboard parsing and cold tracking
 */
class ScoreboardUtil {
    static logger = new Logger('ScoreboardUtil');
    static bot = null;
    static coldRegex = /Cold: -?(\d{1,3})/;
    static cold = 0;
    static scoreboard = new Map(); // String -> Map<Integer, String>
    static scoreObjNames = new Array(19).fill('');

    static init(bot) {
        this.bot = bot;
        this.setupEventHandlers();
    }

    static setupEventHandlers() {
        if (!this.bot) return;

        // Listen for world changes
        this.bot.on('spawn', () => {
            this.onWorldChange();
        });

        // Listen for scoreboard updates
        this.bot.on('scoreboardUpdated', (data) => {
            this.onScoreboardUpdate(data);
        });

        // Listen for chat messages
        this.bot.on('message', (message) => {
            this.onChatDetection(message);
        });
    }

    /**
     * Returns the current scoreboard as a list of strings
     * @return List of scoreboard lines
     */
    static getScoreboard() {
        try {
            const scoreboardData = this.scoreboard.get(this.scoreObjNames[1]);
            if (scoreboardData) {
                return Array.from(scoreboardData.values());
            }
            return [];
        } catch (error) {
            this.logger.error('Error getting scoreboard:', error);
            return [];
        }
    }

    /**
     * Gets the scoreboard title/display name
     * @return Scoreboard title string
     */
    static getScoreboardTitle() {
        if (!this.bot || !this.bot.scoreboard) {
            return '';
        }

        try {
            const scoreboard = this.bot.scoreboard;
            if (!scoreboard) return '';

            // Get the objective in display slot 1 (sidebar)
            const objective = scoreboard.sidebar;
            if (!objective) return '';

            return this.sanitizeString(objective.title || '');
        } catch (error) {
            this.logger.error('Error getting scoreboard title:', error);
            return '';
        }
    }

    /**
     * Sanitizes a string by removing control codes and non-printable characters
     * @param scoreboard The string to sanitize
     * @return Cleaned string
     */
    static sanitizeString(scoreboard) {
        if (!scoreboard) return '';
        
        const arr = Array.from(scoreboard);
        let cleaned = '';
        
        for (let i = 0; i < arr.length; i++) {
            const c = arr[i];
            const charCode = c.charCodeAt(0);
            
            // Include printable ASCII characters (32-126)
            if (charCode >= 32 && charCode < 127) {
                cleaned += c;
            }
            
            // Skip next character if this is a section sign (§)
            if (charCode === 167) { // § character
                i++; // Skip the next character (color code)
            }
        }
        
        return cleaned;
    }

    /**
     * Handles world change events
     */
    static onWorldChange() {
        this.cold = 0;
        this.logger.info('World changed, reset cold to 0');
    }

    /**
     * Handles scoreboard update events
     * @param event The scoreboard update event
     */
    static onScoreboardUpdate(event) {
        try {
            if (!event || !event.line) return;

            const line = event.line;
            
            // Check for cold value in the line
            if (line.includes('Cold:')) {
                const coldMatch = line.match(this.coldRegex);
                if (coldMatch) {
                    this.cold = parseInt(coldMatch[1]);
                    this.logger.debug(`Cold updated to: ${this.cold}`);
                } else {
                    this.cold = 0;
                }
            }

            // Check if cold line is still present in scoreboard
            const scoreboardLines = this.getScoreboard();
            const hasColdLine = scoreboardLines.some(line => 
                this.sanitizeString(line).includes('Cold:')
            );
            
            if (!hasColdLine) {
                this.cold = 0;
            }
        } catch (error) {
            this.logger.error('Error processing scoreboard update:', error);
        }
    }

    /**
     * Handles chat message detection for campfire warming
     * @param message The chat message
     */
    static onChatDetection(message) {
        try {
            if (!message) return;
            
            const messageText = this.stripControlCodes(message.toString());
            
            // Check for campfire warming message
            if (messageText.includes('The warmth of the campfire reduced your') && 
                messageText.includes('Cold')) {
                this.cold = 0;
                this.logger.info('Campfire warmed player, reset cold to 0');
            }
        } catch (error) {
            this.logger.error('Error processing chat message:', error);
        }
    }

    /**
     * Strips Minecraft color codes from text
     * @param text Text to clean
     * @return Cleaned text
     */
    static stripControlCodes(text) {
        if (!text) return '';
        
        // Remove Minecraft color codes (§ followed by any character)
        return text.replace(/§./g, '');
    }

    /**
     * Updates scoreboard data
     * @param objectiveName The objective name
     * @param score The score value
     * @param line The line content
     */
    static updateScoreboardLine(objectiveName, score, line) {
        try {
            if (!this.scoreboard.has(objectiveName)) {
                this.scoreboard.set(objectiveName, new Map());
            }
            
            const objectiveData = this.scoreboard.get(objectiveName);
            objectiveData.set(score, line);
            
            this.logger.debug(`Updated scoreboard line: ${objectiveName}[${score}] = ${line}`);
        } catch (error) {
            this.logger.error('Error updating scoreboard line:', error);
        }
    }

    /**
     * Removes a scoreboard line
     * @param objectiveName The objective name
     * @param score The score value
     */
    static removeScoreboardLine(objectiveName, score) {
        try {
            if (this.scoreboard.has(objectiveName)) {
                const objectiveData = this.scoreboard.get(objectiveName);
                objectiveData.delete(score);
                
                this.logger.debug(`Removed scoreboard line: ${objectiveName}[${score}]`);
            }
        } catch (error) {
            this.logger.error('Error removing scoreboard line:', error);
        }
    }

    /**
     * Gets the current cold value
     * @return Current cold value
     */
    static getCold() {
        return this.cold;
    }

    /**
     * Sets the cold value
     * @param value New cold value
     */
    static setCold(value) {
        this.cold = value;
        this.logger.debug(`Cold set to: ${this.cold}`);
    }

    /**
     * Checks if the player is in a specific location based on scoreboard
     * @param locationName The location name to check for
     * @return True if in the specified location
     */
    static isInLocation(locationName) {
        const scoreboardLines = this.getScoreboard();
        return scoreboardLines.some(line => 
            this.sanitizeString(line).includes(locationName)
        );
    }

    /**
     * Gets a specific scoreboard line by index
     * @param index The line index
     * @return The scoreboard line or empty string
     */
    static getScoreboardLine(index) {
        const lines = this.getScoreboard();
        return lines[index] || '';
    }

    /**
     * Searches for a line containing specific text
     * @param searchText Text to search for
     * @return The matching line or null
     */
    static findScoreboardLine(searchText) {
        const lines = this.getScoreboard();
        return lines.find(line => 
            this.sanitizeString(line).includes(searchText)
        ) || null;
    }

    /**
     * Gets the number of scoreboard lines
     * @return Number of lines
     */
    static getScoreboardSize() {
        return this.getScoreboard().length;
    }

    /**
     * Clears all scoreboard data
     */
    static clearScoreboard() {
        this.scoreboard.clear();
        this.scoreObjNames.fill('');
        this.logger.debug('Scoreboard data cleared');
    }

    /**
     * Gets all scoreboard objectives
     * @return Map of objective names to their data
     */
    static getAllObjectives() {
        return new Map(this.scoreboard);
    }

    /**
     * Checks if scoreboard contains specific text
     * @param text Text to search for
     * @return True if text is found
     */
    static containsText(text) {
        const lines = this.getScoreboard();
        return lines.some(line => 
            this.sanitizeString(line).toLowerCase().includes(text.toLowerCase())
        );
    }

    /**
     * Gets mining-related information from scoreboard
     * @return Object with mining stats
     */
    static getMiningInfo() {
        const lines = this.getScoreboard();
        const info = {
            cold: this.cold,
            heat: 0,
            commission: null,
            location: null
        };

        for (const line of lines) {
            const cleanLine = this.sanitizeString(line);
            
            // Extract heat
            const heatMatch = cleanLine.match(/Heat: (\d+)/i);
            if (heatMatch) {
                info.heat = parseInt(heatMatch[1]);
            }
            
            // Extract commission info
            if (cleanLine.includes('Commission')) {
                info.commission = cleanLine.trim();
            }
            
            // Extract location
            if (cleanLine.includes('⏣')) {
                info.location = cleanLine.trim();
            }
        }

        return info;
    }

    /**
     * Debug method to log current scoreboard state
     */
    static debugScoreboard() {
        this.logger.info('=== SCOREBOARD DEBUG ===');
        this.logger.info(`Title: ${this.getScoreboardTitle()}`);
        this.logger.info(`Cold: ${this.cold}`);
        
        const lines = this.getScoreboard();
        lines.forEach((line, index) => {
            this.logger.info(`Line ${index}: ${this.sanitizeString(line)}`);
        });
        
        this.logger.info('========================');
    }
}

module.exports = ScoreboardUtil;

