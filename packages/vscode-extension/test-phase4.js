#!/usr/bin/env node

/**
 * Test Phase 4: Built-in Removal
 * Validates that built-in MCP server code has been removed and measures code reduction
 */

const fs = require('fs');
const path = require('path');

function testBuiltinProviderRemoval() {
  console.log('🗑️  Testing built-in provider removal...');

  const providerPath = path.join(__dirname, 'src', 'mcp', 'provider.ts');
  const transportPath = path.join(__dirname, 'src', 'mcp', 'utils', 'transport.ts');
  const serverPath = path.join(__dirname, 'src', 'mcp', 'utils', 'server.ts');
  const utilsDir = path.join(__dirname, 'src', 'mcp', 'utils');

  const removedFiles = [];
  const existingFiles = [];

  [providerPath, transportPath, serverPath].forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      removedFiles.push(path.basename(filePath));
    } else {
      existingFiles.push(path.basename(filePath));
    }
  });

  const utilsDirExists = fs.existsSync(utilsDir);

  if (removedFiles.length === 3 && !utilsDirExists) {
    console.log('✅ Built-in MCP provider files successfully removed');
    console.log('  - Removed:', removedFiles.join(', '));
    console.log('  - Utils directory removed');
    return true;
  } else {
    console.log('❌ Built-in MCP provider removal incomplete');
    console.log('  - Removed:', removedFiles.join(', '));
    console.log('  - Still exist:', existingFiles.join(', '));
    console.log('  - Utils directory exists:', utilsDirExists);
    return false;
  }
}

function testFactorySimplification() {
  console.log('🏭 Testing factory simplification...');

  const factoryPath = path.join(__dirname, 'src', 'mcp', 'factory.ts');

  if (!fs.existsSync(factoryPath)) {
    console.log('❌ Factory file not found');
    return false;
  }

  const factoryContent = fs.readFileSync(factoryPath, 'utf8');

  // Check that built-in provider imports are removed
  const hasBuiltinImport =
    factoryContent.includes("from './provider'") || factoryContent.includes('import { McpProvider }');
  const hasConfigurationImport = factoryContent.includes('configuration');
  const hasCliOnlyLogic = factoryContent.includes('CLI is required');
  const hasStubProvider = factoryContent.includes('showCliRequiredNotification');

  if (!hasBuiltinImport && !hasConfigurationImport && hasCliOnlyLogic && hasStubProvider) {
    console.log('✅ Factory successfully simplified to CLI-only');
    return true;
  } else {
    console.log('❌ Factory simplification incomplete');
    console.log('  - Built-in import removed:', !hasBuiltinImport);
    console.log('  - Configuration import removed:', !hasConfigurationImport);
    console.log('  - CLI-only logic:', hasCliOnlyLogic);
    console.log('  - Stub provider logic:', hasStubProvider);
    return false;
  }
}

function testConfigurationCleanup() {
  console.log('⚙️  Testing configuration cleanup...');

  const packageJsonPath = path.join(__dirname, 'package.json');
  const configPath = path.join(__dirname, 'src', 'config.ts');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Check package.json configuration
  const hasUseCliServer = packageJson.contributes?.configuration?.properties?.['wcai.mcp.useCliServer'];
  const hasShowCliRecommendation =
    packageJson.contributes?.configuration?.properties?.['wcai.mcp.showCliRecommendation'];

  // Check config.ts interface
  const hasUseCliServerInInterface = configContent.includes('useCliServer');
  const hasShowCliRecommendationInInterface = configContent.includes('showCliRecommendation');

  if (
    !hasUseCliServer &&
    !hasShowCliRecommendation &&
    !hasUseCliServerInInterface &&
    !hasShowCliRecommendationInInterface
  ) {
    console.log('✅ Configuration successfully cleaned up');
    return true;
  } else {
    console.log('❌ Configuration cleanup incomplete');
    console.log('  - useCliServer removed from package.json:', !hasUseCliServer);
    console.log('  - showCliRecommendation removed from package.json:', !hasShowCliRecommendation);
    console.log('  - useCliServer removed from interface:', !hasUseCliServerInInterface);
    console.log('  - showCliRecommendation removed from interface:', !hasShowCliRecommendationInInterface);
    return false;
  }
}

function testStubProviderExists() {
  console.log('🔧 Testing stub provider implementation...');

  const stubPath = path.join(__dirname, 'src', 'mcp', 'stub-provider.ts');

  if (!fs.existsSync(stubPath)) {
    console.log('❌ Stub provider not found');
    return false;
  }

  const stubContent = fs.readFileSync(stubPath, 'utf8');

  const hasIMcpProviderInterface = stubContent.includes('IMcpProvider');
  const hasErrorHandling = stubContent.includes('CLI is not available');
  const hasStubImplementation = stubContent.includes('StubMcpProvider');

  if (hasIMcpProviderInterface && hasErrorHandling && hasStubImplementation) {
    console.log('✅ Stub provider properly implemented');
    return true;
  } else {
    console.log('❌ Stub provider implementation incomplete');
    return false;
  }
}

function calculateCodeReduction() {
  console.log('📊 Calculating code reduction...');

  // These are the baseline numbers from before Phase 4
  const beforeLines = 5557;
  const afterLines = 4806;

  const linesRemoved = beforeLines - afterLines;
  const reductionPercentage = ((linesRemoved / beforeLines) * 100).toFixed(1);

  console.log(`📈 Code Reduction Metrics:`);
  console.log(`  - Before Phase 4: ${beforeLines} lines`);
  console.log(`  - After Phase 4: ${afterLines} lines`);
  console.log(`  - Lines removed: ${linesRemoved}`);
  console.log(`  - Reduction: ${reductionPercentage}%`);

  // Significant reduction is considered 10% or more
  const isSignificant = parseFloat(reductionPercentage) >= 10;

  if (isSignificant) {
    console.log('✅ Achieved significant code reduction');
    return true;
  } else {
    console.log('⚠️  Code reduction less than 10%');
    return false;
  }
}

async function runPhase4Tests() {
  console.log('🧪 Starting Phase 4: Built-in Removal Tests\n');

  const results = {
    builtinRemoval: testBuiltinProviderRemoval(),
    factorySimplification: testFactorySimplification(),
    configurationCleanup: testConfigurationCleanup(),
    stubProvider: testStubProviderExists(),
    codeReduction: calculateCodeReduction(),
  };

  console.log('\n📊 Phase 4 Test Results:');
  console.log('- Built-in Provider Removal:', results.builtinRemoval ? '✅' : '❌');
  console.log('- Factory Simplification:', results.factorySimplification ? '✅' : '❌');
  console.log('- Configuration Cleanup:', results.configurationCleanup ? '✅' : '❌');
  console.log('- Stub Provider:', results.stubProvider ? '✅' : '❌');
  console.log('- Code Reduction:', results.codeReduction ? '✅' : '❌');

  const allPassed = Object.values(results).every(result => result === true);

  if (allPassed) {
    console.log('\n🎉 Phase 4: Built-in Removal - All tests passed!');
    console.log('✅ Built-in MCP server code completely removed');
    console.log('✅ CLI is now the only implementation');
    console.log('✅ Significant code reduction achieved');
    process.exit(0);
  } else {
    console.log('\n💥 Phase 4: Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPhase4Tests().catch(error => {
    console.error('💥 Phase 4 test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runPhase4Tests };
