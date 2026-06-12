import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  private readonly url = process.env.PROMETHEUS_URL || 'http://prometheus.monitoring:9090';

  private async query(q: string): Promise<number> {
    try {
      const res = await axios.get(`${this.url}/api/v1/query`, { params: { query: q }, timeout: 4000 });
      const v = res.data?.data?.result?.[0]?.value?.[1];
      return v ? parseFloat(v) : 0;
    } catch (e: any) {
      this.logger.debug(`prom query failed: ${e.message}`);
      return 0;
    }
  }

  async getDeploymentMetrics(namespace: string, name: string) {
    const labels = `namespace="${namespace}",pod=~"${name}.*"`;
    const [cpu, memory, rx, tx] = await Promise.all([
      this.query(`sum(rate(container_cpu_usage_seconds_total{${labels}}[5m]))`),
      this.query(`sum(container_memory_working_set_bytes{${labels}})`),
      this.query(`sum(rate(container_network_receive_bytes_total{${labels}}[5m]))`),
      this.query(`sum(rate(container_network_transmit_bytes_total{${labels}}[5m]))`),
    ]);
    return {
      cpu,
      memoryMB: memory / (1024 * 1024),
      networkRxKBs: rx / 1024,
      networkTxKBs: tx / 1024,
    };
  }

  async getRange(namespace: string, name: string, hours = 24) {
    const end = Math.floor(Date.now() / 1000);
    const start = end - hours * 3600;
    const q = `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}.*"}[5m]))`;
    try {
      const res = await axios.get(`${this.url}/api/v1/query_range`, {
        params: { query: q, start, end, step: '300' }, timeout: 6000,
      });
      return res.data?.data?.result?.[0]?.values ?? [];
    } catch {
      return [];
    }
  }
}
