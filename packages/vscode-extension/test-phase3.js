#!/usr/bin/env node

/**
 * Test Phase 3: CLI as Default
 * Validates that the extension now defaults to CLI and falls back gracefully
 */

const fs = require('fs');
const path = require('path');

function testDefaultConfiguration() {
  console.log('🔧 Testing default configuration...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const useCliServerConfig = packageJson.contributes.configuration.properties['wcai.mcp.useCliServer'];
  
  if (useCliServerConfig.default === true) {
    console.log('✅ Default configuration is CLI-based (useCliServer: true)');
    return true;
  } else {
    console.log('❌ Default configuration is still built-in (useCliServer: false)');
    return false;
  }
}

function testFallbackLogic() {
  console.log('🔄 Testing fallback logic...');
  
  // Check if factory.ts has the enhanced fallback logic
  const factoryPath = path.join(__dirname, 'src', 'mcp', 'factory.ts');
  
  if (!fs.existsSync(factoryPath)) {
    console.log('❌ Factory file not found');
    return false;
  }
  
  const factoryContent = fs.readFileSync(factoryPath, 'utf8');
  
  // Check for key fallback features
  const hasCliUnavailableNotification = factoryContent.includes('showCliUnavailableNotification');
  const hasEnhancedFallback = factoryContent.includes('CLI is not available, falling back to built-in');
  const hasDefaultTrue = factoryContent.includes('?? true'); // Default to true
  
  if (hasCliUnavailableNotification && hasEnhancedFallback && hasDefaultTrue) {
    console.log('✅ Enhanced fallback logic is implemented');
    return true;
  } else {
    console.log('❌ Fallback logic is incomplete');
    console.log('  - CLI unavailable notification:', hasCliUnavailableNotification);
    console.log('  - Enhanced fallback:', hasEnhancedFallback);
    console.log('  - Default true:', hasDefaultTrue);
    return false;
  }
}

function testMonitoringIntegration() {
  console.log('📊 Testing monitoring integration...');
  
  // Check if monitoring service exists
  const monitoringPath = path.join(__dirname, 'src', 'mcp', 'monitoring.ts');
  
  if (!fs.existsSync(monitoringPath)) {
    console.log('❌ Monitoring service not found');
    return false;
  }
  
  // Check if container integrates monitoring
  const containerPath = path.join(__dirname, 'src', 'container.ts');
  const containerContent = fs.readFileSync(containerPath, 'utf8');
  
  const hasMonitoringImport = containerContent.includes('McpMonitoringService');
  const hasMonitoringInit = containerContent.includes('new McpMonitoringService');
  const hasMonitoringGetter = containerContent.includes('get mcpMonitoring()');
  
  if (hasMonitoringImport && hasMonitoringInit && hasMonitoringGetter) {
    console.log('✅ Monitoring integration is complete');
    return true;
  } else {
    console.log('❌ Monitoring integration is incomplete');
    console.log('  - Import:', hasMonitoringImport);
    console.log('  - Initialization:', hasMonitoringInit);
    console.log('  - Getter:', hasMonitoringGetter);
    return false;
  }
}

function testMetricsCommand() {
  console.log('📈 Testing metrics command...');
  
  // Check if metrics command exists
  const metricsPath = path.join(__dirname, 'src', 'commands', 'mcp-metrics.ts');
  
  if (!fs.existsSync(metricsPath)) {
    console.log('❌ Metrics command not found');
    return false;
  }
  
  // Check if command is registered in package.json
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const hasMetricsCommand = packageJson.contributes.commands.some(cmd => 
    cmd.command === 'wcai.mcp.showMetrics'
  );
  
  const hasMetricsCommandPalette = packageJson.contributes.menus.commandPalette.some(menu =>
    menu.command === 'wcai.mcp.showMetrics'
  );
  
  if (hasMetricsCommand && hasMetricsCommandPalette) {
    console.log('✅ Metrics command is properly registered');
    return true;
  } else {
    console.log('❌ Metrics command registration is incomplete');
    console.log('  - Command defined:', hasMetricsCommand);
    console.log('  - Command palette:', hasMetricsCommandPalette);
    return false;
  }
}

async function runPhase3Tests() {
  console.log('🧪 Starting Phase 3: CLI as Default Tests\n');
  
  const results = {
    defaultConfig: testDefaultConfiguration(),
    fallbackLogic: testFallbackLogic(),
    monitoringIntegration: testMonitoringIntegration(),
    metricsCommand: testMetricsCommand()
  };
  
  console.log('\n📊 Phase 3 Test Results:');
  console.log('- Default Configuration:', results.defaultConfig ? '✅' : '❌');
  console.log('- Fallback Logic:', results.fallbackLogic ? '✅' : '❌');
  console.log('- Monitoring Integration:', results.monitoringIntegration ? '✅' : '❌');
  console.log('- Metrics Command:', results.metricsCommand ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 Phase 3: CLI as Default - All tests passed!');
    console.log('✅ Extension now defaults to CLI-based MCP server');
    console.log('✅ Graceful fallback to built-in server when CLI unavailable');
    console.log('✅ Performance and issue monitoring implemented');
    process.exit(0);
  } else {
    console.log('\n💥 Phase 3: Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPhase3Tests().catch(error => {
    console.error('💥 Phase 3 test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runPhase3Tests };
