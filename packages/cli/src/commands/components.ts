import { Command } from 'commander';
import { loadConfig } from '../config';
import { Logger } from '../utils/logger';
import { ManifestLocationProvider, ManifestsProvider, getComponentDetails } from '../cem';

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search for web components by name, tag, or description')
    .argument('<query>', 'Search query')
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .option('--matching <strategy>', 'Matching strategy (strict, all, any)', /^(strict|all|any)$/, 'any')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .option('--details <level>', 'Detail level (basic, public, all)', /^(basic|public|all)$/, 'public')
    .action(async (query, options) => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        Logger.setLevel(config.logging.level);

        const locator = new ManifestLocationProvider(workingDir);
        const cemReader = new ManifestsProvider(locator);

        const components = await cemReader.searchComponents(query, options.matching);

        if (options.format === 'json') {
          const result = components.map(component => getComponentDetails(component, options.details));
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Search results for "${query}" (${options.matching} matching):`);
          console.log('');

          if (components.length === 0) {
            console.log('No components found.');
            return;
          }

          for (const component of components) {
            const details = getComponentDetails(component, options.details);

            console.log(`${details.tagName || details.name || 'Unknown'}`);
            if (details.className && details.className !== details.name) {
              console.log(`  Class: ${details.className}`);
            }
            if (details.description) {
              console.log(`  Description: ${details.description}`);
            }

            if (options.details === 'public' || options.details === 'all') {
              const members = details.members || [];
              const properties = members.filter(m => m.kind === 'field' && !m.static);
              const methods = members.filter(m => m.kind === 'method' && !m.static);

              if (properties.length > 0) {
                console.log(`  Properties: ${properties.map(p => p.name).join(', ')}`);
              }
              if (methods.length > 0) {
                console.log(`  Methods: ${methods.map(m => m.name).join(', ')}`);
              }
            }

            console.log('');
          }

          console.log(`Found ${components.length} components`);
        }
      } catch (error) {
        Logger.error('Failed to search components:', error);
        process.exit(1);
      }
    });
}

export function createGetCommand(): Command {
  return new Command('get')
    .description('Get detailed information about a specific component')
    .argument('<identifier>', 'Component tag name or class name')
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .option('--by <type>', 'Search by tag name or class name (tag, class)', /^(tag|class)$/, 'tag')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .option('--details <level>', 'Detail level (basic, public, all)', /^(basic|public|all)$/, 'public')
    .action(async (identifier, options) => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        Logger.setLevel(config.logging.level);

        const locator = new ManifestLocationProvider(workingDir);
        const cemReader = new ManifestsProvider(locator);

        let component;
        if (options.by === 'class') {
          component = await cemReader.getComponentByClassName(identifier);
        } else {
          component = await cemReader.getComponentByTagName(identifier);
        }

        if (!component) {
          console.log(`Component with ${options.by} name "${identifier}" not found.`);
          process.exit(1);
        }

        const details = getComponentDetails(component, options.details);

        if (options.format === 'json') {
          console.log(JSON.stringify(details, null, 2));
        } else {
          console.log(`Component: ${details.tagName || details.name || 'Unknown'}`);
          console.log('');

          if (details.className) {
            console.log(`Class Name: ${details.className}`);
          }
          if (details.tagName) {
            console.log(`Tag Name: ${details.tagName}`);
          }
          if (details.description) {
            console.log(`Description: ${details.description}`);
          }

          if (options.details === 'public' || options.details === 'all') {
            const members = details.members || [];

            // Properties
            const properties = members.filter((m: any) => m.kind === 'field' && !m.static);
            if (properties.length > 0) {
              console.log('');
              console.log('Properties:');
              for (const prop of properties) {
                const propType = (prop as any).type?.text || 'any';
                console.log(`  ${prop.name}: ${propType}`);
                if (prop.description) {
                  console.log(`    ${prop.description}`);
                }
              }
            }

            // Methods
            const methods = members.filter((m: any) => m.kind === 'method' && !m.static);
            if (methods.length > 0) {
              console.log('');
              console.log('Methods:');
              for (const method of methods) {
                const methodAny = method as any;
                const params =
                  methodAny.parameters
                    ?.map((p: any) => `${p.name}${p.type ? `: ${p.type.text || 'any'}` : ''}`)
                    .join(', ') || '';
                const returnType = methodAny.return?.type?.text || 'void';
                console.log(`  ${method.name}(${params}): ${returnType}`);
                if (method.description) {
                  console.log(`    ${method.description}`);
                }
              }
            }

            // Events
            const events = details.events || [];
            if (events.length > 0) {
              console.log('');
              console.log('Events:');
              for (const event of events) {
                console.log(`  ${event.name}${event.type ? `: ${event.type.text || 'CustomEvent'}` : ''}`);
                if (event.description) {
                  console.log(`    ${event.description}`);
                }
              }
            }

            // Attributes
            const attributes = details.attributes || [];
            if (attributes.length > 0) {
              console.log('');
              console.log('Attributes:');
              for (const attr of attributes) {
                console.log(`  ${attr.name}${attr.type ? `: ${attr.type.text || 'string'}` : ''}`);
                if (attr.description) {
                  console.log(`    ${attr.description}`);
                }
              }
            }
          }
        }
      } catch (error) {
        Logger.error('Failed to get component details:', error);
        process.exit(1);
      }
    });
}

export function createComponentsCommand(): Command {
  return new Command('components')
    .description('List all available web components')
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .option('--details <level>', 'Detail level (basic, public, all)', /^(basic|public|all)$/, 'basic')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        Logger.setLevel(config.logging.level);

        const locator = new ManifestLocationProvider(workingDir);
        const cemReader = new ManifestsProvider(locator);

        const components = await cemReader.getAllComponents();

        if (options.format === 'json') {
          const result = components.map(component => getComponentDetails(component, options.details));
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Available Web Components:');
          console.log('');

          if (components.length === 0) {
            console.log('No components found.');
            return;
          }

          for (const component of components) {
            const details = getComponentDetails(component, options.details);

            console.log(`${details.tagName || details.name || 'Unknown'}`);
            if (details.className && details.className !== details.name) {
              console.log(`  Class: ${details.className}`);
            }
            if (details.description) {
              console.log(`  Description: ${details.description}`);
            }
            console.log('');
          }

          console.log(`Total: ${components.length} components`);
        }
      } catch (error) {
        Logger.error('Failed to list components:', error);
        process.exit(1);
      }
    });
}
