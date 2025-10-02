#!/usr/bin/env node

import { program } from './cli';

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments and execute
program.parseAsync(process.argv).catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
