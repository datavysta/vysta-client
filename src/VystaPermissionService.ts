import { VystaClient } from './VystaClient.js';
import { ObjectPermission } from './types.js';

export class VystaPermissionService {
  constructor(private client: VystaClient) {}

  async getConnectionPermissions(connectionName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/connection/${encodeURIComponent(connectionName)}`);
  }

  async getTablePermissions(connectionName: string, tableName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/connection/${encodeURIComponent(connectionName)}/table/${encodeURIComponent(tableName)}`);
  }

  async getViewPermissions(connectionName: string, viewName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/connection/${encodeURIComponent(connectionName)}/view/${encodeURIComponent(viewName)}`);
  }

  async getQueryPermissions(connectionName: string, queryName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/connection/${encodeURIComponent(connectionName)}/query/${encodeURIComponent(queryName)}`);
  }

  async getProcedurePermissions(connectionName: string, procedureName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/connection/${encodeURIComponent(connectionName)}/procedure/${encodeURIComponent(procedureName)}`);
  }

  async getWorkflowPermissions(workflowName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/workflow/${encodeURIComponent(workflowName)}`);
  }

  async getFilesystemPermissions(filesystemName: string): Promise<ObjectPermission> {
    return this.fetchPermission(`/rest/permissions/filesystem/${encodeURIComponent(filesystemName)}`);
  }

  /**
   * Helper: Returns true if the connection has the 'select' grant
   */
  async canSelectConnection(connectionName: string): Promise<boolean> {
    const perms = await this.getConnectionPermissions(connectionName);
    return Array.isArray(perms.grants) && perms.grants.includes('SELECT');
  }

  private async fetchPermission(path: string): Promise<ObjectPermission> {
    const headers = await this.client['auth'].getAuthHeaders();
    const url = this.client.getBackendUrl(`api${path}`);
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch permissions: ${response.statusText}`);
    }
    return response.json();
  }
} 