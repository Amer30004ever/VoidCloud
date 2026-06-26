import { useState, useEffect } from 'react';

interface PermissionCache {
  permissions: string[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem('user_permissions');
      if (cached) {
        const { permissions: cachedPerms, timestamp }: PermissionCache = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setPermissions(cachedPerms);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const user = await res.json();
        const userPerms = user.permissions || [];
        setPermissions(userPerms);
        
        // Cache permissions
        localStorage.setItem(
          'user_permissions',
          JSON.stringify({ permissions: userPerms, timestamp: Date.now() }),
        );
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((perm) => permissions.includes(perm));
  };

  const refreshPermissions = () => {
    localStorage.removeItem('user_permissions');
    loadPermissions();
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };
}
