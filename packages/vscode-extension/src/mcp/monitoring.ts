import type { Disposable } from 'vscode';
import { Logger } from '../system/logger';
import type { Container } from '../container';
import type { IMcpProvider } from './types';

/**
 * Performance and issue monitoring for MCP providers
 */
export class McpMonitoringService implements Disposable {
  private _disposables: Disposable[] = [];
  private _metrics: McpMetrics = {
    startTime: Date.now(),
    restartCount: 0,
    errorCount: 0,
    lastError: undefined,
    uptime: 0,
    providerType: 'unknown',
  };
  private _metricsInterval: NodeJS.Timeout | undefined;

  constructor(
    private readonly _container: Container,
    private readonly _provider: IMcpProvider,
  ) {
    // Determine provider type based on constructor name
    this._metrics.providerType = this._provider.constructor.name === 'CliMcpProvider' ? 'cli' : 'builtin';
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Update metrics every 30 seconds
    this._metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000);

    // Listen for provider state changes
    this._disposables.push(
      this._provider.onDidChangeHttpServerState(() => {
        this.onProviderStateChange();
      }),
    );

    Logger.log('MCP monitoring service started');
  }

  private updateMetrics(): void {
    this._metrics.uptime = Date.now() - this._metrics.startTime;

    // Log metrics periodically (every 5 minutes)
    if (this._metrics.uptime % (5 * 60 * 1000) < 30000) {
      this.logMetrics();
    }
  }

  private onProviderStateChange(): void {
    const serverInfo = this._provider.getServerInfo();

    if (serverInfo) {
      // Server started/restarted
      if (this._metrics.uptime > 60000) {
        // Only count as restart if we've been running for more than 1 minute
        this._metrics.restartCount++;
        Logger.warn(`MCP server restarted (restart count: ${this._metrics.restartCount})`);
      }
    } else {
      // Server stopped
      Logger.log('MCP server stopped');
    }
  }

  /**
   * Record an error for monitoring
   */
  recordError(error: Error | unknown, context?: string): void {
    this._metrics.errorCount++;
    this._metrics.lastError = {
      message: error instanceof Error ? error.message : String(error),
      context: context || 'unknown',
      timestamp: Date.now(),
    };

    Logger.error(error, `MCP monitoring recorded error${context ? ` in ${context}` : ''}`);

    // Check if we should alert about high error rates
    this.checkErrorThresholds();
  }

  private checkErrorThresholds(): void {
    const uptimeHours = this._metrics.uptime / (1000 * 60 * 60);
    const errorRate = this._metrics.errorCount / Math.max(uptimeHours, 0.1); // Errors per hour

    // Alert if error rate is high (more than 10 errors per hour)
    if (errorRate > 10 && this._metrics.errorCount > 5) {
      Logger.warn(`High MCP error rate detected: ${errorRate.toFixed(1)} errors/hour`);

      // Store alert in extension storage for potential user notification
      void this._container.storage.store('mcpHighErrorRate', {
        errorRate,
        errorCount: this._metrics.errorCount,
        timestamp: Date.now(),
      });
    }
  }

  private logMetrics(): void {
    const uptimeMinutes = Math.floor(this._metrics.uptime / (1000 * 60));
    const serverInfo = this._provider.getServerInfo();

    Logger.log(
      `MCP Metrics - Uptime: ${uptimeMinutes}m, Restarts: ${this._metrics.restartCount}, Errors: ${this._metrics.errorCount}, Status: ${serverInfo ? 'Running' : 'Stopped'}`,
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): McpMetrics {
    return {
      ...this._metrics,
      uptime: Date.now() - this._metrics.startTime,
    };
  }

  /**
   * Reset metrics (useful after configuration changes)
   */
  resetMetrics(): void {
    this._metrics = {
      startTime: Date.now(),
      restartCount: 0,
      errorCount: 0,
      lastError: undefined,
      uptime: 0,
      providerType: this._metrics.providerType,
    };
    Logger.log('MCP metrics reset');
  }

  dispose(): void {
    if (this._metricsInterval) {
      clearInterval(this._metricsInterval);
      this._metricsInterval = undefined;
    }

    this._disposables.forEach(d => d.dispose());
    this._disposables = [];

    Logger.log('MCP monitoring service disposed');
  }
}

export interface McpMetrics {
  startTime: number;
  uptime: number;
  restartCount: number;
  errorCount: number;
  lastError?: {
    message: string;
    context: string;
    timestamp: number;
  };
  providerType: 'builtin' | 'cli' | 'unknown';
}
