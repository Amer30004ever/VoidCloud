'use client';

import { useEffect, useState } from 'react';
import { checkAllServices } from '@/lib/health';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
}

export default function HealthDashboardPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    checkAllServices().then(setServices);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">System Health</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.name}
            className={`rounded-lg border p-4 ${
              service.status === 'healthy'
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}
          >
            <h3 className="font-medium">{service.name}</h3>
            <p
              className={`text-sm ${
                service.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {service.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
