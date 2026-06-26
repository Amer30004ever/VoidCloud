"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  uptime: string;
  lastCheck: string;
  responseTime?: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
}

interface ServiceHealth {
  database: HealthStatus;
  redis: HealthStatus;
  kubernetes: HealthStatus;
  whatsappApi: HealthStatus;
  smtp: HealthStatus;
}

export default function SystemHealthDashboard() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealthData = useCallback(async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/v1/health/services"),
        fetch("/api/v1/health/metrics"),
      ]);

      if (healthRes.ok) setHealthData(await healthRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN") {
      window.location.href = "/voidcloud/dashboard";
      return;
    }
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [user, fetchHealthData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500";
      case "degraded":
        return "bg-yellow-500";
      case "down":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-emerald-300";
      case "degraded":
        return "text-yellow-300";
      case "down":
        return "text-red-300";
      default:
        return "text-gray-300";
    }
  };

  if (loading) return <div className="p-6 text-white/50">Loading system health...</div>;

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Health Dashboard</h1>
          <p className="text-white/50 mt-2">Real-time monitoring of all system services</p>
        </div>
        <div className="text-white/30 text-sm">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {healthData && Object.entries(healthData).map(([key, service]) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</h3>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/50">Status</span>
                <span className={`font-medium ${getStatusText(service.status)}`}>{service.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Uptime</span>
                <span className="text-white">{service.uptime}</span>
              </div>
              {service.responseTime && (
                <div className="flex justify-between">
                  <span className="text-white/50">Response Time</span>
                  <span className="text-white">{service.responseTime}ms</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50">Last Check</span>
                <span className="text-white/50 text-sm">{new Date(service.lastCheck).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">CPU Usage</h3>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{metrics.cpuUsage}%</p>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${metrics.cpuUsage > 80 ? 'bg-red-500' : metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">Memory Usage</h3>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{metrics.memoryUsage}%</p>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${metrics.memoryUsage > 80 ? 'bg-red-500' : metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">Disk Usage</h3>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{metrics.diskUsage}%</p>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${metrics.diskUsage > 80 ? 'bg-red-500' : metrics.diskUsage > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${metrics.diskUsage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">Error Rate</h3>
            <p className={`text-3xl font-bold ${metrics.errorRate > 5 ? 'text-red-400' : metrics.errorRate > 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {metrics.errorRate}%
            </p>
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">Active Connections</h3>
            <p className="text-3xl font-bold text-cyan-400">{metrics.activeConnections}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white/50 text-sm mb-2">Queue Size</h3>
            <p className={`text-3xl font-bold ${metrics.queueSize > 1000 ? 'text-red-400' : metrics.queueSize > 500 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {metrics.queueSize}
            </p>
          </div>
        </div>
      )}

      {/* System Events */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent System Events</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="flex-1">
              <p className="text-white font-medium">WhatsApp API reconnected</p>
              <p className="text-white/50 text-sm">Connection restored after brief outage</p>
            </div>
            <span className="text-white/30 text-sm">2 min ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="flex-1">
              <p className="text-white font-medium">High memory usage detected</p>
              <p className="text-white/50 text-sm">Memory usage exceeded 75% threshold</p>
            </div>
            <span className="text-white/30 text-sm">15 min ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="flex-1">
              <p className="text-white font-medium">Database backup completed</p>
              <p className="text-white/50 text-sm">Scheduled backup finished successfully</p>
            </div>
            <span className="text-white/30 text-sm">1 hour ago</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-center text-cyan-300 hover:bg-cyan-400/20">
            Restart Services
          </button>
          <button className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 p-4 text-center text-fuchsia-300 hover:bg-fuchsia-400/20">
            Clear Queue
          </button>
          <button className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-emerald-300 hover:bg-emerald-400/20">
            Run Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
