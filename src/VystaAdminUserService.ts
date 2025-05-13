import { VystaAdminService } from './base/VystaAdminService.js';
import { VystaClient } from './VystaClient.js';
import { Role } from './types.js';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  // The API returns roleIds and roleNames as comma-delimited strings
  roleIds: string;
  roleNames: string;
  // Array versions of the roles
  roleIdsArray: string[];
  roleNamesArray: string[];
  invitationId?: string;
  forceChange: boolean;
  disabled: boolean;
  createdOn: string;
  modifiedOn: string;
  properties?: string;
  password?: string;
}

// Derive CreateUserData from User
export type CreateUserData = Pick<User, 'name' | 'email'> & 
  Partial<Pick<User, 'phoneNumber' | 'disabled' | 'forceChange' | 'properties' | 'password'>> & {
    // For creating users, we use arrays of role IDs
    roleIds: string[];
  };

export class VystaAdminUserService extends VystaAdminService<User> {
  constructor(client: VystaClient) {
    super(client, 'security', 'user', { primaryKey: 'id' });
  }

  async listUsers(): Promise<User[]> {
    const result = await this.getAll();
    return result.data;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const result = await this.create(userData as unknown as User);
    return result;
  }

  async updateUser(id: string, userData: Partial<CreateUserData>): Promise<User> {
    // Include the id in the update data even though it's in the URL
    const updateData = {
      ...userData,
      id
    };
    await this.update(id, updateData as unknown as Partial<User>);
    return this.getById(id);
  }

  async resendInvitation(id: string): Promise<void> {
    // The post method will handle the response appropriately based on Content-Type
    await this.client.post(`api/security/user/${id}/resendinvitation`, {});
  }

  async sendForgotPassword(id: string): Promise<void> {
    // The post method will handle the response appropriately based on Content-Type
    await this.client.post(`api/security/user/${id}/forgotpassword`, {});
  }

  async forgotPassword(user: User | string): Promise<void> {
    const userId = typeof user === 'string' ? user : user.id;
    // The post method will handle the response appropriately based on Content-Type
    await this.client.post(`api/security/user/${userId}/forgotpassword`, {});
  }

  async revokeByUserId(id: string): Promise<void> {
    await this.delete(id);
  }

  async sendInvitation(user: User | string): Promise<void> {
    const userId = typeof user === 'string' ? user : user.id;
    // The post method will handle the response appropriately based on Content-Type
    await this.client.post(`api/security/user/${userId}/invite`, {});
  }

  /**
   * Gets the invitation URL for a user
   * @param user User object or user ID
   * @returns The invitation URL as a string
   */
  async copyInvitation(user: User | string): Promise<string> {
    const userId = typeof user === 'string' ? user : user.id;
    // Server now returns { url: string } in JSON format
    const response = await this.client.post(`api/security/user/${userId}/copyinvitation`, {});
    // Extract the URL from the response
    if (typeof response === 'object' && response !== null && 'url' in response) {
      return (response as { url: string }).url;
    }
    // Fallback in case the response format is unexpected
    return String(response);
  }


} 