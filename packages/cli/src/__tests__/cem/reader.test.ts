import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ManifestReader } from '../../cem/reader';
import { Uri } from '../../utils/uri';
import type { Package } from 'custom-elements-manifest';

// Mock the fs module and utils
jest.mock('fs/promises');
jest.mock('../../utils/logger');

// Mock the uri utils explicitly
jest.mock('../../utils/uri', () => ({
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  exists: jest.fn(),
  readTextFile: jest.fn(),
}));

const mockManifest: Package = {
  schemaVersion: '1.0.0',
  readme: '',
  modules: [
    {
      kind: 'javascript-module',
      path: './src/my-element.js',
      declarations: [
        {
          kind: 'class',
          description: 'A custom element for testing',
          name: 'MyElement',
          tagName: 'my-element',
          customElement: true,
          members: [
            {
              kind: 'field',
              name: 'value',
              type: { text: 'string' },
              description: 'The element value',
              attribute: 'value',
            },
            {
              kind: 'method',
              name: 'setValue',
              parameters: [
                {
                  name: 'newValue',
                  type: { text: 'string' },
                  description: 'The new value to set',
                },
              ],
              description: 'Sets the element value',
            },
          ],
          events: [
            {
              name: 'value-changed',
              type: { text: 'CustomEvent<string>' },
              description: 'Fired when the value changes',
            },
          ],
        },
      ],
      exports: [
        {
          kind: 'js',
          name: 'MyElement',
          declaration: { name: 'MyElement', module: './src/my-element.js' },
        },
      ],
    },
  ],
};

describe('ManifestReader', () => {
  let reader: ManifestReader;
  let mockStat: jest.MockedFunction<any>;
  let mockExists: jest.MockedFunction<any>;
  let mockReadTextFile: jest.MockedFunction<any>;
  let manifestUri: Uri;

  beforeEach(() => {
    // Create a mock Uri with required methods
    manifestUri = {
      fsPath: '/path/to/custom-elements.json',
      toString: jest.fn().mockReturnValue('file:///path/to/custom-elements.json'),
    } as any;

    reader = new ManifestReader(manifestUri);

    // Get the mocked functions
    const uriUtils = require('../../utils/uri');
    mockExists = uriUtils.exists as jest.MockedFunction<any>;
    mockReadTextFile = uriUtils.readTextFile as jest.MockedFunction<any>;

    // Reset mocks
    jest.clearAllMocks();

    // Mock fs.stat - use different times to avoid caching issues
    const fs = require('fs/promises');
    mockStat = fs.stat as jest.MockedFunction<any>;
    mockStat.mockResolvedValue({ mtime: new Date(Date.now() + Math.random() * 1000) });
  });

  describe('getAllComponents', () => {
    it('should read and parse components from a valid manifest', async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));

      const result = await reader.getAllComponents();

      expect(mockExists).toHaveBeenCalledWith(manifestUri);
      expect(mockReadTextFile).toHaveBeenCalledWith(manifestUri);
      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('my-element');
      expect(result[0].className).toBe('MyElement');
    });

    it('should return empty array when manifest file does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await reader.getAllComponents();

      expect(result).toEqual([]);
      expect(mockReadTextFile).not.toHaveBeenCalled();
    });

    it('should return empty array for invalid JSON', async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue('invalid json');

      const result = await reader.getAllComponents();

      expect(result).toEqual([]);
    });

    it('should cache components after first read', async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));

      // First read
      const result1 = await reader.getAllComponents();
      expect(mockReadTextFile).toHaveBeenCalledTimes(1);

      // Second read should use cache
      const result2 = await reader.getAllComponents();
      expect(mockReadTextFile).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });
  });

  describe('getComponentByTagName', () => {
    beforeEach(async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));
    });

    it('should find component by tag name', async () => {
      const component = await reader.getComponentByTagName('my-element');

      expect(component).toBeDefined();
      expect(component?.tagName).toBe('my-element');
      expect(component?.className).toBe('MyElement');
      expect(component?.description).toBe('A custom element for testing');
    });

    it('should return undefined for non-existent tag', async () => {
      const component = await reader.getComponentByTagName('non-existent');

      expect(component).toBeUndefined();
    });
  });

  describe('getComponentByClassName', () => {
    beforeEach(async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));
    });

    it('should find component by class name', async () => {
      const component = await reader.getComponentByClassName('MyElement');

      expect(component).toBeDefined();
      expect(component?.className).toBe('MyElement');
      expect(component?.tagName).toBe('my-element');
    });

    it('should return undefined for non-existent class', async () => {
      const component = await reader.getComponentByClassName('NonExistent');

      expect(component).toBeUndefined();
    });
  });

  describe('clearCaches', () => {
    it('should clear component caches', async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));

      // Read components to populate cache
      await reader.getAllComponents();
      expect(mockReadTextFile).toHaveBeenCalledTimes(1);

      // Clear caches
      reader.clearCaches();

      // Read again should use cached manifest but rebuild component caches
      await reader.getAllComponents();
      expect(mockReadTextFile).toHaveBeenCalledTimes(1); // Still cached at manifest level
    });
  });

  describe('searchComponents', () => {
    beforeEach(async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(mockManifest));
    });

    it('should find components by name', async () => {
      const results = await reader.searchComponents('MyElement');

      expect(results).toHaveLength(1);
      expect(results[0].className).toBe('MyElement');
    });

    it('should find components by tag name', async () => {
      const results = await reader.searchComponents('my-element');

      expect(results).toHaveLength(1);
      expect(results[0].tagName).toBe('my-element');
    });

    it('should return empty array for no matches', async () => {
      const results = await reader.searchComponents('non-existent');

      expect(results).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle malformed manifest structure gracefully', async () => {
      const malformedManifest = {
        schemaVersion: '1.0.0',
        modules: [
          {
            // Missing required fields
            declarations: [
              {
                kind: 'class',
                // Missing name
              },
            ],
          },
        ],
      };

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(malformedManifest));

      // Should not throw, but should handle gracefully
      const components = await reader.getAllComponents();
      expect(components).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockRejectedValue(new Error('File read error'));

      // Should not throw, but should return empty array
      const components = await reader.getAllComponents();
      expect(components).toEqual([]);
    });
  });
});
