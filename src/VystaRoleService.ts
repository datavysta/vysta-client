import { VystaClient } from './VystaClient.js';
import { Role } from './types.js';

export class VystaRoleService {
  constructor(private client: VystaClient) {}

  async getAllRoles(): Promise<Role[]> {
    const headers = await this.client['auth'].getAuthHeaders();
    const url = this.client.getBackendUrl('admin/security/role');
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`);
    }
    return response.json();
  }
}
