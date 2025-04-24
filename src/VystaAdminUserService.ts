import { VystaAdminService } from './base/VystaAdminService.js';
import { VystaClient } from './VystaClient.js';

export interface User {
  id: string;
  name: string;
  createdOn: string;
  modifiedOn: string;
  email: string;
  roleId: 'ADMIN' | 'USER';
  roleName: string;
  disabled: boolean;
  forceChange: boolean;
}

export class VystaAdminUserService extends VystaAdminService<User> {
  constructor(client: VystaClient) {
    super(client, 'security', 'user', { primaryKey: 'id' });
  }

  async listUsers(): Promise<User[]> {
    const result = await this.getAll();
    return result.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    await this.update(id, userData);
    return this.getById(id);
  }

  async resendInvitation(id: string): Promise<void> {
    await this.client.post(`api/security/user/${id}/resendinvitation`, {});
  }

  async sendForgotPassword(id: string): Promise<void> {
    await this.client.post(`api/security/user/${id}/forgotpassword`, {});
  }
} 