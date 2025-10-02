import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ManifestReader } from '../../cem/reader';
import { Uri } from '../../utils/uri';
import type { Package } from 'custom-elements-manifest';

// Mock the fs module
jest.mock('fs/promises');

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
  let mockReadFile: jest.MockedFunction<any>;

  beforeEach(() => {
    reader = new ManifestReader();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs.readFile
    const fs = require('fs/promises');
    mockReadFile = fs.readFile as jest.MockedFunction<any>;
  });

  describe('readManifest', () => {
    it('should read and parse a valid manifest', async () => {
      const manifestUri = Uri.file('/path/to/custom-elements.json');
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      const result = await reader.readManifest(manifestUri);

      expect(mockReadFile).toHaveBeenCalledWith('/path/to/custom-elements.json', 'utf8');
      expect(result).toEqual(mockManifest);
    });

    it('should throw error for invalid JSON', async () => {
      const manifestUri = Uri.file('/path/to/invalid.json');
      mockReadFile.mockResolvedValue('invalid json');

      await expect(reader.readManifest(manifestUri)).rejects.toThrow();
    });

    it('should throw error for file read failure', async () => {
      const manifestUri = Uri.file('/path/to/missing.json');
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(reader.readManifest(manifestUri)).rejects.toThrow('File not found');
    });

    it('should cache manifest after first read', async () => {
      const manifestUri = Uri.file('/path/to/cached.json');
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      // First read
      const result1 = await reader.readManifest(manifestUri);
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Second read should use cache
      const result2 = await reader.readManifest(manifestUri);
      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });
  });

  describe('getComponents', () => {
    beforeEach(async () => {
      const manifestUri = Uri.file('/path/to/test.json');
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));
      await reader.readManifest(manifestUri);
    });

    it('should extract components from manifest', async () => {
      const manifestUri = Uri.file('/path/to/test.json');
      const components = await reader.getComponents(manifestUri);

      expect(components).toHaveLength(1);
      expect(components[0]).toMatchObject({
        name: 'MyElement',
        tagName: 'my-element',
        description: 'A custom element for testing',
        customElement: true,
      });
    });

    it('should return empty array for manifest without components', async () => {
      const emptyManifest: Package = {
        schemaVersion: '1.0.0',
        readme: '',
        modules: [],
      };

      const manifestUri = Uri.file('/path/to/empty.json');
      mockReadFile.mockResolvedValue(JSON.stringify(emptyManifest));

      const components = await reader.getComponents(manifestUri);
      expect(components).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear manifest cache', async () => {
      const manifestUri = Uri.file('/path/to/cached.json');
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      // Read manifest to populate cache
      await reader.readManifest(manifestUri);
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Clear cache
      reader.clearCache();

      // Read again should call fs.readFile again
      await reader.readManifest(manifestUri);
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('should clear specific manifest from cache', async () => {
      const manifestUri1 = Uri.file('/path/to/manifest1.json');
      const manifestUri2 = Uri.file('/path/to/manifest2.json');
      
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      // Read both manifests
      await reader.readManifest(manifestUri1);
      await reader.readManifest(manifestUri2);
      expect(mockReadFile).toHaveBeenCalledTimes(2);

      // Clear specific manifest
      reader.clearCache(manifestUri1);

      // Read manifest1 again should call fs.readFile
      await reader.readManifest(manifestUri1);
      expect(mockReadFile).toHaveBeenCalledTimes(3);

      // Read manifest2 again should use cache
      await reader.readManifest(manifestUri2);
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle malformed manifest structure', async () => {
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

      const manifestUri = Uri.file('/path/to/malformed.json');
      mockReadFile.mockResolvedValue(JSON.stringify(malformedManifest));

      // Should not throw, but should handle gracefully
      const components = await reader.getComponents(manifestUri);
      expect(components).toEqual([]);
    });

    it('should handle network URIs', async () => {
      const networkUri = Uri.parse('https://example.com/manifest.json');
      
      // Should throw for network URIs since we only support file URIs
      await expect(reader.readManifest(networkUri)).rejects.toThrow();
    });
  });
});
