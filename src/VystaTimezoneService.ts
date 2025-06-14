import { VystaClient } from './VystaClient.js';

export interface Timezone {
  id: string;
  displayName: string;
}

export class VystaTimezoneService {
  constructor(private client: VystaClient) {}

  async getAllTimezones(): Promise<Timezone[]> {
    const headers = await this.client['auth'].getAuthHeaders();
    const url = this.client.getBackendUrl('admin/i18n/timezone');
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch timezones: ${response.statusText}`);
    }
    return response.json();
  }
}
