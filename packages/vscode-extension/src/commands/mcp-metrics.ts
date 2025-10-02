import { window } from 'vscode';
import type { Container } from '../container';
import { command } from '../system/decorators/command';
import { CommandBase } from './base';

@command()
export class McpMetricsCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.mcp.showMetrics');
  }

  async execute() {
    const monitoring = this.container.mcpMonitoring;
    
    if (!monitoring) {
      window.showErrorMessage('MCP monitoring is not available.');
      return;
    }

    const metrics = monitoring.getMetrics();
    const serverInfo = this.container.mcp.getServerInfo();
    
    // Format uptime
    const uptimeMinutes = Math.floor(metrics.uptime / (1000 * 60));
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const remainingMinutes = uptimeMinutes % 60;
    const uptimeStr = uptimeHours > 0 
      ? `${uptimeHours}h ${remainingMinutes}m`
      : `${uptimeMinutes}m`;

    // Format last error
    const lastErrorStr = metrics.lastError 
      ? `${metrics.lastError.message} (${new Date(metrics.lastError.timestamp).toLocaleTimeString()})`
      : 'None';

    const metricsInfo = [
      `**MCP Server Metrics**`,
      ``,
      `**Status:** ${serverInfo ? '🟢 Running' : '🔴 Stopped'}`,
      `**Provider Type:** ${metrics.providerType}`,
      `**Uptime:** ${uptimeStr}`,
      `**Restart Count:** ${metrics.restartCount}`,
      `**Error Count:** ${metrics.errorCount}`,
      `**Last Error:** ${lastErrorStr}`,
      ``
    ];

    if (serverInfo) {
      metricsInfo.push(
        `**Server Details:**`,
        `- Host: ${serverInfo.hostName}:${serverInfo.port}`,
        `- HTTP: ${serverInfo.mcpUrl}`,
        `- SSE: ${serverInfo.sseUrl}`,
        ``
      );
    }

    const resetMetrics = 'Reset Metrics';
    const copyMetrics = 'Copy to Clipboard';
    const close = 'Close';

    const result = await window.showInformationMessage(
      metricsInfo.join('\n'),
      { modal: true },
      resetMetrics,
      copyMetrics,
      close
    );

    if (result === resetMetrics) {
      monitoring.resetMetrics();
      window.showInformationMessage('✅ MCP metrics have been reset.');
    } else if (result === copyMetrics) {
      await this.copyMetricsToClipboard(metrics, serverInfo);
    }
  }

  private async copyMetricsToClipboard(metrics: any, serverInfo: any): Promise<void> {
    const metricsJson = JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      serverInfo
    }, null, 2);

    try {
      await window.env.clipboard.writeText(metricsJson);
      window.showInformationMessage('📋 MCP metrics copied to clipboard.');
    } catch (error) {
      window.showErrorMessage('Failed to copy metrics to clipboard.');
    }
  }
}
