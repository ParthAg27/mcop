const Logger = require('../core/Logger');

/**
 * TablistUtil
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.util.TablistUtil
 * Handles Hypixel tablist parsing and player information extraction
 */
class TablistUtil {
    static logger = new Logger('TablistUtil');
    static bot = null;
    static cachedTablist = [];
    static cachedTablistFooter = [];

    // GlaciteVeins enum equivalent
    static GlaciteVeins = {
        AMBER: 'AMBER',
        SAPPHIRE: 'SAPPHIRE', 
        AMETHYST: 'AMETHYST',
        RUBY: 'RUBY',
        JADE: 'JADE',
        AQUAMARINE: 'AQUAMARINE',
        ONYX: 'ONYX',
        PERIDOT: 'PERIDOT',
        CITRINE: 'CITRINE',
        TOPAZ: 'TOPAZ',
        TUNGSTEN: 'TUNGSTEN',
        UMBER: 'UMBER',
        GLACITE: 'GLACITE'
    };

    static init(bot) {
        this.bot = bot;
        this.setupEventHandlers();
    }

    static setupEventHandlers() {
        if (!this.bot) return;

        // Listen for tablist updates
        this.bot.on('playerlistHeaderAndFooter', (data) => {
            this.onTablistUpdate(data);
        });

        // Listen for player list updates
        this.bot.on('playerJoined', () => {
            this.updateTablist();
        });

        this.bot.on('playerLeft', () => {
            this.updateTablist();
        });
    }

    /**
     * Sets the cached tablist
     * @param tablist List of tablist entries
     */
    static setCachedTablist(tablist) {
        this.cachedTablist = [...tablist];
        this.logger.debug(`Updated cached tablist with ${tablist.length} entries`);
    }

    /**
     * Sets the cached tablist footer
     * @param tabListFooter List of footer entries
     */
    static setCachedTabListFooter(tabListFooter) {
        this.cachedTablistFooter = [...tabListFooter];
        this.logger.debug(`Updated cached tablist footer with ${tabListFooter.length} entries`);
    }

    /**
     * Gets the cached tablist
     * @return Array of cached tablist entries
     */
    static getCachedTablist() {
        return [...this.cachedTablist];
    }

    /**
     * Gets the cached tablist footer
     * @return Array of cached footer entries
     */
    static getCachedTablistFooter() {
        return [...this.cachedTablistFooter];
    }

    /**
     * Gets raw tablist players without processing
     * @return List of player names
     */
    static getTabListPlayersUnprocessed() {
        try {
            if (!this.bot || !this.bot.players) {
                return [];
            }

            const result = [];
            const players = Object.values(this.bot.players);
            
            // Sort players similar to the Java implementation
            players.sort(this.comparePlayerInfo.bind(this));

            for (const player of players) {
                if (player.displayName) {
                    result.push(player.displayName);
                } else if (player.username) {
                    result.push(player.username);
                }
            }

            return result;
        } catch (error) {
            this.logger.error('Error getting unprocessed tablist players:', error);
            return [];
        }
    }

    /**
     * Gets Skyblock-formatted tablist players
     * @return List of cleaned player names
     */
    static getTabListPlayersSkyblock() {
        try {
            const tabListPlayersFormatted = this.getTabListPlayersUnprocessed();
            const playerList = [];
            
            if (tabListPlayersFormatted.length === 0) {
                return [];
            }

            // Remove "Players (x)" entry
            tabListPlayersFormatted.shift();
            
            let firstPlayer = null;
            
            for (let s of tabListPlayersFormatted) {
                const bracketIndex = s.indexOf(']');
                if (bracketIndex === -1) {
                    continue;
                }
                
                if (s.length < bracketIndex + 2) {
                    continue; // if the player name is too short (e.g. "§c[§f]")
                }

                // Extract player name and clean it
                s = s.substring(bracketIndex + 2)
                    .replace(/§[0-9a-fk-or]/g, '')  // Remove color codes
                    .replace(/♲/g, '')              // Remove recycling symbol
                    .trim();
                
                if (firstPlayer === null) {
                    firstPlayer = s;
                } else if (s === firstPlayer) {
                    // It returns two copies of the player list for some reason
                    break;
                }
                
                playerList.push(s);
            }
            
            return playerList;
        } catch (error) {
            this.logger.error('Error getting Skyblock tablist players:', error);
            return [];
        }
    }

    /**
     * Gets Glacite commission information from tablist
     * @return Map of GlaciteVeins to progress percentages
     */
    static getGlaciteComs() {
        const glaciteComPattern = /(.+?) (Gemstone )?Collector: ?(\d{1,3}(\.\d+)?%|DONE)/;
        const comms = new Map();
        let foundCommission = false;
        
        for (const text of this.cachedTablist) {
            if (!foundCommission) {
                if (text.toLowerCase() === 'commissions:') {
                    foundCommission = true;
                }
                continue;
            }

            const glaciteComMatch = text.match(glaciteComPattern);
            if (glaciteComMatch) {
                const material = this.convertMaterial(glaciteComMatch[1].trim());
                const progressStr = glaciteComMatch[3];

                let progressValue;
                if (progressStr === 'DONE') {
                    progressValue = 100;
                } else {
                    progressValue = parseFloat(progressStr.replace('%', ''));
                }

                if (material !== null) {
                    comms.set(material, progressValue);
                }
            }
        }

        return comms;
    }

    /**
     * Converts material name to GlaciteVeins enum
     * @param material Material name
     * @return GlaciteVeins enum value or null
     */
    static convertMaterial(material) {
        switch (material) {
            case 'Amber':
                return this.GlaciteVeins.AMBER;
            case 'Sapphire':
                return this.GlaciteVeins.SAPPHIRE;
            case 'Amethyst':
                return this.GlaciteVeins.AMETHYST;
            case 'Ruby':
                return this.GlaciteVeins.RUBY;
            case 'Jade':
                return this.GlaciteVeins.JADE;
            case 'Aquamarine':
                return this.GlaciteVeins.AQUAMARINE;
            case 'Onyx':
                return this.GlaciteVeins.ONYX;
            case 'Peridot':
                return this.GlaciteVeins.PERIDOT;
            case 'Citrine':
                return this.GlaciteVeins.CITRINE;
            case 'Topaz':
                return this.GlaciteVeins.TOPAZ;
            case 'Tungsten':
                return this.GlaciteVeins.TUNGSTEN;
            case 'Umber':
                return this.GlaciteVeins.UMBER;
            case 'Glacite':
                return this.GlaciteVeins.GLACITE;
            default:
                return null;
        }
    }

    /**
     * Player comparison function (equivalent to PlayerComparator)
     * @param player1 First player info
     * @param player2 Second player info
     * @return Comparison result
     */
    static comparePlayerInfo(player1, player2) {
        // Prioritize non-spectators
        const isSpectator1 = player1.gamemode === 3; // Spectator mode
        const isSpectator2 = player2.gamemode === 3;
        
        if (isSpectator1 !== isSpectator2) {
            return isSpectator1 ? 1 : -1;
        }

        // Compare team names
        const team1 = player1.team || '';
        const team2 = player2.team || '';
        
        const teamComparison = team1.localeCompare(team2);
        if (teamComparison !== 0) {
            return teamComparison;
        }

        // Compare player names
        const name1 = player1.username || '';
        const name2 = player2.username || '';
        
        return name1.localeCompare(name2);
    }

    /**
     * Handles tablist update events
     * @param data Tablist header and footer data
     */
    static onTablistUpdate(data) {
        try {
            if (data.header) {
                const headerLines = this.parseTablistText(data.header);
                // Process header if needed
            }

            if (data.footer) {
                const footerLines = this.parseTablistText(data.footer);
                this.setCachedTabListFooter(footerLines);
            }

            // Update full tablist
            this.updateTablist();
        } catch (error) {
            this.logger.error('Error handling tablist update:', error);
        }
    }

    /**
     * Updates the cached tablist
     */
    static updateTablist() {
        try {
            const tablistEntries = [];
            
            // Get current tablist data
            if (this.bot && this.bot.tablist) {
                // Parse tablist entries
                for (const [uuid, entry] of this.bot.tablist.entries()) {
                    if (entry.displayName) {
                        tablistEntries.push(entry.displayName);
                    }
                }
            }

            this.setCachedTablist(tablistEntries);
        } catch (error) {
            this.logger.error('Error updating tablist:', error);
        }
    }

    /**
     * Parses tablist text (handles JSON text components)
     * @param textComponent Text component to parse
     * @return Array of text lines
     */
    static parseTablistText(textComponent) {
        if (typeof textComponent === 'string') {
            return textComponent.split('\n');
        }
        
        if (typeof textComponent === 'object' && textComponent !== null) {
            // Handle JSON text component
            let text = '';
            
            if (textComponent.text) {
                text += textComponent.text;
            }
            
            if (textComponent.extra) {
                for (const extra of textComponent.extra) {
                    if (extra.text) {
                        text += extra.text;
                    }
                }
            }
            
            return text.split('\n');
        }
        
        return [];
    }

    /**
     * Searches for a specific line in the tablist
     * @param searchText Text to search for
     * @return Found line or null
     */
    static findTablistLine(searchText) {
        return this.cachedTablist.find(line => 
            line.toLowerCase().includes(searchText.toLowerCase())
        ) || null;
    }

    /**
     * Gets lines containing specific text
     * @param searchText Text to search for
     * @return Array of matching lines
     */
    static getTablistLinesContaining(searchText) {
        return this.cachedTablist.filter(line => 
            line.toLowerCase().includes(searchText.toLowerCase())
        );
    }

    /**
     * Extracts numeric value from tablist line
     * @param line Tablist line
     * @param pattern Regex pattern to match
     * @return Extracted number or null
     */
    static extractNumberFromLine(line, pattern) {
        const match = line.match(pattern);
        if (match && match[1]) {
            const numberStr = match[1].replace(/[,\s]/g, '');
            return parseFloat(numberStr);
        }
        return null;
    }

    /**
     * Gets commission progress from tablist
     * @return Map of commission types to progress
     */
    static getCommissionProgress() {
        const commissions = new Map();
        let inCommissionSection = false;
        
        for (const line of this.cachedTablist) {
            const cleanLine = this.stripControlCodes(line);
            
            if (cleanLine.includes('Commissions:')) {
                inCommissionSection = true;
                continue;
            }
            
            if (inCommissionSection) {
                // Look for commission patterns
                const progressMatch = cleanLine.match(/(.+?):\s*(\d+(?:\.\d+)?%|DONE)/i);
                if (progressMatch) {
                    const commissionName = progressMatch[1].trim();
                    const progressStr = progressMatch[2];
                    
                    let progress;
                    if (progressStr === 'DONE') {
                        progress = 100;
                    } else {
                        progress = parseFloat(progressStr.replace('%', ''));
                    }
                    
                    commissions.set(commissionName, progress);
                }
                
                // Stop if we hit an empty line or section divider
                if (cleanLine.trim() === '' || cleanLine.includes('---')) {
                    break;
                }
            }
        }
        
        return commissions;
    }

    /**
     * Strips Minecraft color codes from text
     * @param text Text to clean
     * @return Cleaned text
     */
    static stripControlCodes(text) {
        if (!text) return '';
        
        // Remove Minecraft color codes (§ followed by any character)
        return text.replace(/§./g, '').replace(/[\u00A7\u001B]\[[0-9;]*m/g, '');
    }

    /**
     * Gets player count from tablist
     * @return Number of players
     */
    static getPlayerCount() {
        if (!this.bot || !this.bot.players) {
            return 0;
        }
        return Object.keys(this.bot.players).length;
    }

    /**
     * Checks if a player is in the tablist
     * @param playerName Player name to check
     * @return True if player is present
     */
    static isPlayerInTablist(playerName) {
        const players = this.getTabListPlayersSkyblock();
        return players.includes(playerName);
    }

    /**
     * Debug method to log current tablist state
     */
    static debugTablist() {
        this.logger.info('=== TABLIST DEBUG ===');
        this.logger.info(`Cached entries: ${this.cachedTablist.length}`);
        this.logger.info(`Footer entries: ${this.cachedTablistFooter.length}`);
        
        this.cachedTablist.forEach((line, index) => {
            this.logger.info(`Line ${index}: ${this.stripControlCodes(line)}`);
        });
        
        this.logger.info('===================');
    }
}

module.exports = TablistUtil;

