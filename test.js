/**
 * Test script to verify MightyMiner Node.js implementation
 */
const MightyMiner = require('./src/MightyMiner');
const MightyMinerConfig = require('./src/config/MightyMinerConfig');
const MacroManager = require('./src/macro/MacroManager');
const MiningMacro = require('./src/macro/impl/MiningMacro');
const Logger = require('./src/util/Logger');
const Clock = require('./src/util/Clock');

// Test all components
console.log('\n=== MightyMiner Node.js Test ===\n');

// Test 1: Clock functionality
console.log('1. Testing Clock...');
const clock = new Clock();
clock.schedule(1000);
console.log('   Clock scheduled for 1000ms');
console.log('   Is scheduled:', clock.isScheduled());
console.log('   Has passed (should be false):', clock.passed());
setTimeout(() => {
    console.log('   Has passed after 1100ms (should be true):', clock.passed());
}, 1100);

// Test 2: Logger functionality 
console.log('\n2. Testing Logger...');
Logger.sendMessage('Test message from Logger');
Logger.sendWarning('Test warning from Logger');
Logger.sendError('Test error from Logger');
Logger.sendNote('Test note from Logger');

// Test 3: Config functionality
console.log('\n3. Testing Config...');
const config = MightyMinerConfig.getInstance();
console.log('   Default macro type:', config.getMacroTypeString());
console.log('   Default ore type:', config.getOreTypeString());
console.log('   Mining tool:', config.miningTool || 'Not set');

// Test 4: MiningMacro functionality
console.log('\n4. Testing MiningMacro...');
const miningMacro = MiningMacro.getInstance();
console.log('   Macro name:', miningMacro.getName());
console.log('   Is enabled:', miningMacro.isEnabled());
miningMacro.enable();
console.log('   After enable - Is enabled:', miningMacro.isEnabled());

// Test 5: MacroManager functionality
console.log('\n5. Testing MacroManager...');
const macroManager = MacroManager.getInstance();
console.log('   Is macro enabled:', macroManager.isEnabled());
const currentMacro = macroManager.getCurrentMacro();
if (currentMacro) {
    console.log('   Current macro available:', currentMacro.getName());
} else {
    console.log('   No current macro (expected without bot)');
}

// Test 6: MightyMiner main class
console.log('\n6. Testing MightyMiner...');
const mightyMiner = MightyMiner.getInstance();
console.log('   Version:', MightyMiner.VERSION);
console.log('   Mod ID:', MightyMiner.modid);

console.log('\n=== Test Complete ===');
console.log('\nTo test with a real bot, run:');
console.log('node src/MightyMiner.js --username YOUR_EMAIL --password YOUR_PASSWORD --auth microsoft');
console.log('\nNote: Make sure to install dependencies first with "npm install"');

