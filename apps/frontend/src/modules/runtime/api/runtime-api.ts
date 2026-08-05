/**
 * Runtime Module API
 * 
 * TanStack Query hooks for Runtime module
 */

import type {
  Runtime,
  RuntimeSession,
} from '@/shared/types/api';

// API 端点
const API_BASE = '/_api/runtimes';

export const runtimeApi = {
  // Runtime Management
  async list(): Promise<Runtime[]> {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch runtimes');
    const data: { data: Runtime[] } = await res.json();
    return data.data || [];
  },

  async get(id: string): Promise<Runtime> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch runtime');
    const data = await res.json();
    return data.data;
  },

  async getByProject(projectId: string): Promise<Runtime[]> {
    const res = await fetch(`${API_BASE}/project/${projectId}`);
    if (!res.ok) throw new Error('Failed to fetch project runtimes');
    const data: { data: Runtime[] } = await res.json();
    return data.data || [];
  },

  async register(payload: {
    agentId: string;
    agentName: string;
    projectId?: string;
    capabilities: { type: string; enabled: boolean; version?: string }[];
  }): Promise<Runtime> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to register runtime');
    const data = await res.json();
    return data.data;
  },

  async updateCapabilities(
    id: string,
    capabilities: { type: string; enabled: boolean; version?: string }[],
  ): Promise<Runtime> {
    const res = await fetch(`${API_BASE}/${id}/capabilities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities }),
    });
    if (!res.ok) throw new Error('Failed to update capabilities');
    const data = await res.json();
    return data.data;
  },

  async heartbeat(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}/heartbeat`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to send heartbeat');
  },

  async disconnect(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}/disconnect`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to disconnect runtime');
  },

  // Runtime Sessions
  async listSessions(runtimeId: string): Promise<RuntimeSession[]> {
    const res = await fetch(`${API_BASE}/${runtimeId}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const data = await res.json();
    return data.data || [];
  },

  async getSession(id: string): Promise<RuntimeSession> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    const data = await res.json();
    return data.data;
  },
};
