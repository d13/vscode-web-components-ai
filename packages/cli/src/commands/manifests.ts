import { Command } from 'commander';
import { loadConfig } from '../config';
import { Logger } from '../utils/logger';
import { ManifestLocationProvider, ManifestsProvider } from '../cem';

export function createListCommand(): Command {
  return new Command('list')
    .description('List all discovered custom elements manifests')
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .option('--include-excluded', 'Include excluded manifests in output')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        Logger.setLevel(config.logging.level);

        const locator = new ManifestLocationProvider(workingDir);
        const manifests = await locator.getManifests();

        const excludedSet = new Set(config.manifests.exclude);

        if (options.format === 'json') {
          const result = manifests.map(uri => ({
            uri: uri.toString(),
            excluded: excludedSet.has(uri.toString()),
          }));
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Custom Elements Manifests:');
          console.log('');

          if (manifests.length === 0) {
            console.log('No manifests found.');
            return;
          }

          let includedCount = 0;
          let excludedCount = 0;

          for (const uri of manifests) {
            const isExcluded = excludedSet.has(uri.toString());

            if (isExcluded) {
              excludedCount++;
              if (options.includeExcluded) {
                console.log(`  ${uri.toString()} (excluded)`);
              }
            } else {
              includedCount++;
              console.log(`  ${uri.toString()}`);
            }
          }

          console.log('');
          console.log(`Total: ${manifests.length} manifests (${includedCount} included, ${excludedCount} excluded)`);
        }
      } catch (error) {
        Logger.error('Failed to list manifests:', error);
        process.exit(1);
      }
    });
}

export function createLocateCommand(): Command {
  return new Command('locate')
    .description('Locate custom elements manifests in the workspace')
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .option('--show-sources', 'Show manifest sources (package.json vs direct files)')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        Logger.setLevel(config.logging.level);

        const locator = new ManifestLocationProvider(workingDir);
        const manifestSources = await locator.locate();

        if (options.format === 'json') {
          console.log(JSON.stringify(manifestSources, null, 2));
        } else {
          console.log('Manifest Discovery Results:');
          console.log('');

          if (manifestSources.length === 0) {
            console.log('No manifests found.');
            return;
          }

          const bySource = manifestSources.reduce(
            (acc: any, source: any) => {
              const key = source.source;
              if (!acc[key]) acc[key] = [];
              acc[key].push(source);
              return acc;
            },
            {} as Record<string, any[]>,
          );

          for (const [sourceType, sources] of Object.entries(bySource)) {
            console.log(`${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Sources:`);

            for (const source of sources as any[]) {
              console.log(`  ${source.uri.toString()}`);
              if (options.showSources && source.packageFile) {
                console.log(`    from: ${source.packageFile.toString()}`);
              }
            }
            console.log('');
          }

          console.log(`Total: ${manifestSources.length} manifests found`);
        }
      } catch (error) {
        Logger.error('Failed to locate manifests:', error);
        process.exit(1);
      }
    });
}

export function createIncludeCommand(): Command {
  return new Command('include')
    .description('Include a manifest in component discovery')
    .argument('<uri>', 'URI of the manifest to include')
    .option('--working-dir <dir>', 'Working directory')
    .action(async (uri, options) => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        // Remove from exclude list if present
        const updatedExclude = config.manifests.exclude.filter(excluded => excluded !== uri);

        if (updatedExclude.length === config.manifests.exclude.length) {
          Logger.log(`Manifest ${uri} was not excluded`);
        } else {
          // Update configuration
          const { getConfigManager, saveLocalConfig } = await import('../config');
          const configManager = getConfigManager(workingDir);
          await configManager.loadConfig();
          configManager.updateConfig({
            manifests: { exclude: updatedExclude },
          });
          await saveLocalConfig(workingDir);

          Logger.log(`Manifest ${uri} included in component discovery`);
        }
      } catch (error) {
        Logger.error('Failed to include manifest:', error);
        process.exit(1);
      }
    });
}

export function createExcludeCommand(): Command {
  return new Command('exclude')
    .description('Exclude a manifest from component discovery')
    .argument('<uri>', 'URI of the manifest to exclude')
    .option('--working-dir <dir>', 'Working directory')
    .action(async (uri, options) => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        // Add to exclude list if not already present
        if (config.manifests.exclude.includes(uri)) {
          Logger.log(`Manifest ${uri} is already excluded`);
        } else {
          const updatedExclude = [...config.manifests.exclude, uri];

          // Update configuration
          const { getConfigManager, saveLocalConfig } = await import('../config');
          const configManager = getConfigManager(workingDir);
          await configManager.loadConfig();
          configManager.updateConfig({
            manifests: { exclude: updatedExclude },
          });
          await saveLocalConfig(workingDir);

          Logger.log(`Manifest ${uri} excluded from component discovery`);
        }
      } catch (error) {
        Logger.error('Failed to exclude manifest:', error);
        process.exit(1);
      }
    });
}
