'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function BusinessDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome back, {user?.name ?? 'Admin'}</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-gray-500">Conversations</h3>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-gray-500">Leads</h3>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-gray-500">VPS Instances</h3>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>
    </div>
  );
}
