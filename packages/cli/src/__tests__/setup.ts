import { jest } from '@jest/globals';

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Mock console methods to avoid noise in test output
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  // Restore all mocks after each test
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock URIs
  createMockUri: (path: string) => ({
    scheme: 'file',
    path,
    fsPath: path,
    toString: () => `file://${path}`,
  }),
  
  // Helper to create mock manifests
  createMockManifest: (components: any[] = []) => ({
    schemaVersion: '1.0.0',
    readme: '',
    modules: components.map(component => ({
      kind: 'javascript-module',
      path: `./src/${component.tagName}.js`,
      declarations: [component],
      exports: [{
        kind: 'js',
        name: component.name,
        declaration: { name: component.name, module: `./src/${component.tagName}.js` },
      }],
    })),
  }),
  
  // Helper to create mock components
  createMockComponent: (overrides: any = {}) => ({
    kind: 'class',
    name: 'MockElement',
    tagName: 'mock-element',
    description: 'A mock element for testing',
    customElement: true,
    members: [],
    events: [],
    ...overrides,
  }),
};

// Extend global types for test utilities
declare global {
  var testUtils: {
    createMockUri: (path: string) => any;
    createMockManifest: (components?: any[]) => any;
    createMockComponent: (overrides?: any) => any;
  };
}
