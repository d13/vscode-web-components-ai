import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CustomElementsManifestReader } from '../cem/reader';
import { getComponentDetails } from '../cem/reader';
import { Logger } from '../utils/logger';

export const MANIFEST_SCHEME = 'manifest' as const;

export function enrichMcpServer(server: McpServer, cemReader: CustomElementsManifestReader): void {
  // Add server resources for web components
  server.resource('manifest', `${MANIFEST_SCHEME}://components`, async (uri: URL) => {
    try {
      const components = (await cemReader.getAllComponents()).map(component => getComponentDetails(component));
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(components),
          },
        ],
      };
    } catch (error) {
      Logger.error('Error getting all components for resource:', error);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify([]),
          },
        ],
      };
    }
  });

  server.resource(
    'manifest-components',
    new ResourceTemplate(`${MANIFEST_SCHEME}://components/{tag}`, { list: undefined }),
    async (uri: URL, variables) => {
      try {
        let component = await cemReader.getComponentByTagName(variables.tag as string);
        if (component) {
          component = getComponentDetails(component);
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(component),
            },
          ],
        };
      } catch (error) {
        Logger.error(`Error getting component ${variables.tag} for resource:`, error);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(null),
            },
          ],
        };
      }
    },
  );

  // Add tools for web component development
  server.tool(
    'search-web-components',
    'Search for web components by name, tag name, or description. Returns matching components with their full public API including attributes, properties, methods, and events.',
    {
      query: z.string().describe('Search term to find components by name, tag, or description'),
      matching: z
        .enum(['strict', 'all', 'any'])
        .optional()
        .default('any')
        .describe(
          'Matching strategy for search. Options are "strict" (exact match), "all" (all terms must match), or "any" (any term can match). Default is "any".',
        ),
    },
    {
      title: 'Search Available Web Components',
      readOnlyHint: true,
    },
    async ({ query, matching }) => {
      try {
        const matchingComponents = (await cemReader.searchComponents(query, matching)).map(component =>
          getComponentDetails(component),
        );

        return {
          content: [
            {
              type: 'text',
              text: `Found ${matchingComponents.length} components matching "${query}":\n\n${JSON.stringify(
                matchingComponents,
                null,
                2,
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching components: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get-web-component-details-by-tag-name',
    'Get detailed information about a specific web component by its tag name. Returns the full public API of the component including attributes, properties, methods, and events.',
    {
      tagName: z.string().describe('The tag name of the component to get details for'),
    },
    {
      title: 'Get Web Component Details by Tag Name',
      readOnlyHint: true,
    },
    async ({ tagName }) => {
      try {
        let component = await cemReader.getComponentByTagName(tagName);

        if (!component) {
          return {
            content: [
              {
                type: 'text',
                text: `Component with tag name "${tagName}" not found.`,
              },
            ],
            isError: true,
          };
        }

        component = getComponentDetails(component);
        return {
          content: [
            {
              type: 'text',
              text: `Component Details for "${tagName}":\n\n${JSON.stringify(component, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting component details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get-web-component-details-by-class-name',
    'Get detailed information about a specific web component by its class name. Returns the full public API of the component including attributes, properties, methods, and events.',
    {
      className: z.string().describe('The class name of the component to get details for'),
    },
    {
      title: 'Get Web Component Details by Class Name',
      readOnlyHint: true,
    },
    async ({ className }) => {
      try {
        let component = await cemReader.getComponentByClassName(className);

        if (!component) {
          return {
            content: [
              {
                type: 'text',
                text: `Component with class name "${className}" not found.`,
              },
            ],
            isError: true,
          };
        }

        component = getComponentDetails(component);
        return {
          content: [
            {
              type: 'text',
              text: `Component Details for "${className}":\n\n${JSON.stringify(component, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting component details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list-all-web-components',
    'List all available web components in the workspace. Can return just basic information or the full public API including attributes, properties, methods, and events.',
    {
      includeDetails: z
        .boolean()
        .optional()
        .describe(
          'Whether to include the full public API for each component or just the tag name, class name, and description (default: true)',
        ),
    },
    {
      title: 'List All Web Components',
      readOnlyHint: true,
    },
    async ({ includeDetails = true }) => {
      try {
        const components = await cemReader.getAllComponents();

        const componentList = components.map(component =>
          getComponentDetails(component, includeDetails ? 'public' : 'basic'),
        );

        return {
          content: [
            {
              type: 'text',
              text: `Found ${components.length} components:\n\n${JSON.stringify(componentList, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing components: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

export function createMcpServer(
  name = 'wcai-server',
  version = '1.0.0',
  cemReader: CustomElementsManifestReader,
): McpServer {
  const server = new McpServer({ name, version });
  enrichMcpServer(server, cemReader);
  return server;
}
