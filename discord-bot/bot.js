const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const MightyMiner = require('../src/MightyMiner');
const MightyMinerConfig = require('../src/core/MightyMinerConfig');
const Logger = require('../src/core/Logger');

class MightyMinerDiscordBot {
    constructor() {
        this.client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ] 
        });
        this.logger = new Logger('DiscordBot');
        this.config = new MightyMinerConfig();
        this.mightyMiner = null;
        this.authorizedUsers = new Set(); // Add authorized user IDs here
        this.currentSettings = {
            macro: 'none',
            miningSpeed: 1000,
            blocks: [],
            failsafes: true,
            autoSell: false,
            autoWarp: false,
            stats: true
        };
        
        this.setupCommands();
        this.setupEventHandlers();
    }

    async init(token, authorizedUsers = []) {
        this.authorizedUsers = new Set(authorizedUsers);
        await this.client.login(token);
        this.logger.info('Discord bot logged in successfully!');
    }

    setupCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('status')
                .setDescription('Get current MightyMiner status'),
                
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Start MightyMiner')
                .addStringOption(option => 
                    option.setName('macro')
                        .setDescription('Macro to start')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Commission Macro', value: 'commission' },
                            { name: 'Mining Macro', value: 'mining' },
                            { name: 'Glacial Macro', value: 'glacial' },
                            { name: 'Route Mining', value: 'route' },
                            { name: 'Powder Macro', value: 'powder' }
                        )),
                        
            new SlashCommandBuilder()
                .setName('stop')
                .setDescription('Stop MightyMiner'),
                
            new SlashCommandBuilder()
                .setName('settings')
                .setDescription('Open MightyMiner settings panel'),
                
            new SlashCommandBuilder()
                .setName('screenshot')
                .setDescription('Take a screenshot of current status'),
                
            new SlashCommandBuilder()
                .setName('logs')
                .setDescription('Get recent logs')
                .addIntegerOption(option =>
                    option.setName('lines')
                        .setDescription('Number of log lines to retrieve')
                        .setMinValue(10)
                        .setMaxValue(100)),
                        
            new SlashCommandBuilder()
                .setName('stats')
                .setDescription('Get mining statistics'),
                
            new SlashCommandBuilder()
                .setName('failsafes')
                .setDescription('Manage failsafe settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable failsafes')
                        .setRequired(true)),
                        
            new SlashCommandBuilder()
                .setName('emergency')
                .setDescription('Emergency stop - immediately halt all operations'),
                
            new SlashCommandBuilder()
                .setName('config')
                .setDescription('View or modify configuration')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Configuration action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'View', value: 'view' },
                            { name: 'Export', value: 'export' },
                            { name: 'Reset', value: 'reset' }
                        ))
        ];

        this.commands = commands;
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            this.logger.info(`Logged in as ${this.client.user.tag}!`);
            this.registerSlashCommands();
        });

        this.client.on('interactionCreate', async interaction => {
            if (interaction.isCommand()) {
                await this.handleCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isSelectMenu()) {
                await this.handleSelectMenu(interaction);
            }
        });
    }

    async registerSlashCommands() {
        try {
            await this.client.application.commands.set(this.commands);
            this.logger.info('Successfully registered application commands.');
        } catch (error) {
            this.logger.error('Error registering commands:', error);
        }
    }

    async handleCommand(interaction) {
        if (!this.isAuthorized(interaction.user.id)) {
            await interaction.reply({ content: '❌ You are not authorized to use this bot.', ephemeral: true });
            return;
        }

        const { commandName } = interaction;

        try {
            switch (commandName) {
                case 'status':
                    await this.handleStatusCommand(interaction);
                    break;
                case 'start':
                    await this.handleStartCommand(interaction);
                    break;
                case 'stop':
                    await this.handleStopCommand(interaction);
                    break;
                case 'settings':
                    await this.handleSettingsCommand(interaction);
                    break;
                case 'screenshot':
                    await this.handleScreenshotCommand(interaction);
                    break;
                case 'logs':
                    await this.handleLogsCommand(interaction);
                    break;
                case 'stats':
                    await this.handleStatsCommand(interaction);
                    break;
                case 'failsafes':
                    await this.handleFailsafesCommand(interaction);
                    break;
                case 'emergency':
                    await this.handleEmergencyCommand(interaction);
                    break;
                case 'config':
                    await this.handleConfigCommand(interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
            }
        } catch (error) {
            this.logger.error(`Error handling command ${commandName}:`, error);
            await interaction.reply({ content: '❌ An error occurred while processing the command.', ephemeral: true });
        }
    }

    async handleStatusCommand(interaction) {
        const status = this.getMinerStatus();
        const embed = this.createStatusEmbed(status);
        await interaction.reply({ embeds: [embed] });
    }

    async handleStartCommand(interaction) {
        const macro = interaction.options.getString('macro');
        
        await interaction.deferReply();
        
        try {
            const result = await this.startMacro(macro);
            
            const embed = new EmbedBuilder()
                .setTitle('🚀 Macro Started')
                .setDescription(`Successfully started ${macro} macro`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Macro Type', value: macro, inline: true },
                    { name: 'Status', value: result.status, inline: true },
                    { name: 'Started At', value: new Date().toLocaleString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Failed to Start Macro')
                .setDescription(`Error: ${error.message}`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }

    async handleStopCommand(interaction) {
        await interaction.deferReply();
        
        try {
            await this.stopMacro();
            
            const embed = new EmbedBuilder()
                .setTitle('⏹️ Macro Stopped')
                .setDescription('MightyMiner has been stopped successfully')
                .setColor(0xFF9900)
                .addFields(
                    { name: 'Stopped At', value: new Date().toLocaleString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Failed to Stop Macro')
                .setDescription(`Error: ${error.message}`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }

    async handleSettingsCommand(interaction) {
        const embed = this.createSettingsEmbed();
        const buttons = this.createSettingsButtons();
        
        await interaction.reply({ 
            embeds: [embed], 
            components: [buttons],
            ephemeral: true 
        });
    }

    async handleScreenshotCommand(interaction) {
        await interaction.deferReply();
        
        try {
            const screenshotPath = await this.takeScreenshot();
            const attachment = new AttachmentBuilder(screenshotPath, { name: 'mightyminer-status.png' });
            
            const embed = new EmbedBuilder()
                .setTitle('📸 MightyMiner Screenshot')
                .setDescription('Current status screenshot')
                .setImage('attachment://mightyminer-status.png')
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });
            
            // Clean up screenshot file
            setTimeout(() => {
                fs.unlink(screenshotPath).catch(console.error);
            }, 5000);
            
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Screenshot Failed')
                .setDescription(`Error taking screenshot: ${error.message}`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }

    async handleLogsCommand(interaction) {
        const lines = interaction.options.getInteger('lines') || 50;
        
        try {
            const logs = await this.getRecentLogs(lines);
            const logText = logs.join('\n');
            
            if (logText.length > 4000) {
                // Create log file if too long
                const logFile = path.join(__dirname, 'temp_logs.txt');
                await fs.writeFile(logFile, logText);
                const attachment = new AttachmentBuilder(logFile, { name: 'mightyminer-logs.txt' });
                
                await interaction.reply({ 
                    content: `📄 Recent ${lines} log lines (file attached)`,
                    files: [attachment] 
                });
                
                setTimeout(() => {
                    fs.unlink(logFile).catch(console.error);
                }, 5000);
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(`📄 Recent ${lines} Log Lines`)
                    .setDescription(`\`\`\`\n${logText}\n\`\`\``)
                    .setColor(0x0099FF)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ Error retrieving logs.', ephemeral: true });
        }
    }

    async handleStatsCommand(interaction) {
        const stats = await this.getMiningStats();
        const embed = this.createStatsEmbed(stats);
        await interaction.reply({ embeds: [embed] });
    }

    async handleFailsafesCommand(interaction) {
        const enabled = interaction.options.getBoolean('enabled');
        
        this.currentSettings.failsafes = enabled;
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Failsafes Updated')
            .setDescription(`Failsafes have been ${enabled ? 'enabled' : 'disabled'}`)
            .setColor(enabled ? 0x00FF00 : 0xFF9900)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async handleEmergencyCommand(interaction) {
        await interaction.deferReply();
        
        try {
            await this.emergencyStop();
            
            const embed = new EmbedBuilder()
                .setTitle('🚨 EMERGENCY STOP ACTIVATED')
                .setDescription('All MightyMiner operations have been immediately halted')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Action Taken', value: 'Force stopped all macros and features', inline: false },
                    { name: 'Time', value: new Date().toLocaleString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ content: '❌ Emergency stop failed!', ephemeral: true });
        }
    }

    async handleConfigCommand(interaction) {
        const action = interaction.options.getString('action');
        
        switch (action) {
            case 'view':
                const embed = this.createConfigEmbed();
                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            case 'export':
                await this.handleConfigExport(interaction);
                break;
            case 'reset':
                await this.handleConfigReset(interaction);
                break;
        }
    }

    async handleButton(interaction) {
        const { customId } = interaction;
        
        if (customId.startsWith('settings_')) {
            await this.handleSettingsButton(interaction);
        }
    }

    async handleSettingsButton(interaction) {
        const action = interaction.customId.replace('settings_', '');
        
        switch (action) {
            case 'macro':
                await this.showMacroSettings(interaction);
                break;
            case 'blocks':
                await this.showBlockSettings(interaction);
                break;
            case 'speed':
                await this.showSpeedSettings(interaction);
                break;
            case 'features':
                await this.showFeatureSettings(interaction);
                break;
            case 'failsafes':
                await this.showFailsafeSettings(interaction);
                break;
            case 'save':
                await this.saveSettings(interaction);
                break;
        }
    }

    // Helper Methods
    
    isAuthorized(userId) {
        return this.authorizedUsers.has(userId) || this.authorizedUsers.size === 0;
    }

    getMinerStatus() {
        // This would integrate with your actual MightyMiner instance
        return {
            running: this.mightyMiner?.isRunning() || false,
            macro: this.currentSettings.macro,
            uptime: this.mightyMiner?.getUptime() || 0,
            errors: this.mightyMiner?.getErrors() || [],
            stats: this.mightyMiner?.getStats() || {}
        };
    }

    createStatusEmbed(status) {
        const embed = new EmbedBuilder()
            .setTitle('⚡ MightyMiner Status')
            .setColor(status.running ? 0x00FF00 : 0xFF0000)
            .addFields(
                { name: '🔄 Status', value: status.running ? 'Running' : 'Stopped', inline: true },
                { name: '🎯 Current Macro', value: status.macro || 'None', inline: true },
                { name: '⏱️ Uptime', value: this.formatUptime(status.uptime), inline: true },
                { name: '❌ Errors', value: status.errors.length.toString(), inline: true },
                { name: '📊 Blocks Mined', value: status.stats.blocksMined?.toString() || '0', inline: true },
                { name: '💰 Profit', value: status.stats.profit?.toString() || '0', inline: true }
            )
            .setTimestamp();

        return embed;
    }

    createSettingsEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ MightyMiner Settings')
            .setDescription('Configure your mining bot settings')
            .setColor(0x0099FF)
            .addFields(
                { name: '🎯 Current Macro', value: this.currentSettings.macro, inline: true },
                { name: '⚡ Mining Speed', value: this.currentSettings.miningSpeed.toString(), inline: true },
                { name: '🛡️ Failsafes', value: this.currentSettings.failsafes ? 'Enabled' : 'Disabled', inline: true },
                { name: '💰 Auto Sell', value: this.currentSettings.autoSell ? 'Enabled' : 'Disabled', inline: true },
                { name: '🌀 Auto Warp', value: this.currentSettings.autoWarp ? 'Enabled' : 'Disabled', inline: true },
                { name: '📊 Stats', value: this.currentSettings.stats ? 'Enabled' : 'Disabled', inline: true }
            )
            .setTimestamp();

        return embed;
    }

    createSettingsButtons() {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('settings_macro')
                    .setLabel('🎯 Macro')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('settings_blocks')
                    .setLabel('🧱 Blocks')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('settings_speed')
                    .setLabel('⚡ Speed')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('settings_features')
                    .setLabel('🔧 Features')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('settings_save')
                    .setLabel('💾 Save')
                    .setStyle(ButtonStyle.Success)
            );
    }

    async takeScreenshot() {
        const timestamp = Date.now();
        const screenshotPath = path.join(__dirname, `screenshot_${timestamp}.png`);
        
        try {
            const img = await screenshot({ format: 'png' });
            
            // Resize and optimize image
            await sharp(img)
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                .png({ quality: 80 })
                .toFile(screenshotPath);
                
            return screenshotPath;
        } catch (error) {
            this.logger.error('Screenshot error:', error);
            throw error;
        }
    }

    async getRecentLogs(lines) {
        // This would integrate with your logging system
        // For now, return mock logs
        const mockLogs = [];
        for (let i = 0; i < lines; i++) {
            mockLogs.push(`[${new Date().toISOString()}] [INFO] Sample log line ${i + 1}`);
        }
        return mockLogs;
    }

    async getMiningStats() {
        // This would integrate with your stats system
        return {
            blocksMined: 1234,
            profit: 50000,
            efficiency: 85.5,
            uptime: 3600000,
            commissionsCompleted: 15,
            errors: 2
        };
    }

    createStatsEmbed(stats) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Mining Statistics')
            .setColor(0x00FF00)
            .addFields(
                { name: '⛏️ Blocks Mined', value: stats.blocksMined.toLocaleString(), inline: true },
                { name: '💰 Profit', value: `${stats.profit.toLocaleString()} coins`, inline: true },
                { name: '📈 Efficiency', value: `${stats.efficiency}%`, inline: true },
                { name: '⏱️ Uptime', value: this.formatUptime(stats.uptime), inline: true },
                { name: '📋 Commissions', value: stats.commissionsCompleted.toString(), inline: true },
                { name: '❌ Errors', value: stats.errors.toString(), inline: true }
            )
            .setTimestamp();

        return embed;
    }

    createConfigEmbed() {
        const configData = JSON.stringify(this.currentSettings, null, 2);
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Current Configuration')
            .setDescription(`\`\`\`json\n${configData}\n\`\`\``)
            .setColor(0x0099FF)
            .setTimestamp();

        return embed;
    }

    formatUptime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    async startMacro(macro) {
        // This would integrate with your MightyMiner instance
        this.currentSettings.macro = macro;
        return { status: 'Started successfully' };
    }

    async stopMacro() {
        // This would integrate with your MightyMiner instance
        this.currentSettings.macro = 'none';
    }

    async emergencyStop() {
        // This would force stop everything
        await this.stopMacro();
        this.logger.warn('EMERGENCY STOP ACTIVATED');
    }

    // Additional placeholder methods for settings panels
    async showMacroSettings(interaction) { await interaction.reply({ content: '🎯 Macro settings panel', ephemeral: true }); }
    async showBlockSettings(interaction) { await interaction.reply({ content: '🧱 Block settings panel', ephemeral: true }); }
    async showSpeedSettings(interaction) { await interaction.reply({ content: '⚡ Speed settings panel', ephemeral: true }); }
    async showFeatureSettings(interaction) { await interaction.reply({ content: '🔧 Feature settings panel', ephemeral: true }); }
    async showFailsafeSettings(interaction) { await interaction.reply({ content: '🛡️ Failsafe settings panel', ephemeral: true }); }
    async saveSettings(interaction) { await interaction.reply({ content: '💾 Settings saved!', ephemeral: true }); }
    async handleConfigExport(interaction) { await interaction.reply({ content: '📤 Config exported!', ephemeral: true }); }
    async handleConfigReset(interaction) { await interaction.reply({ content: '🔄 Config reset!', ephemeral: true }); }
}

module.exports = MightyMinerDiscordBot;

