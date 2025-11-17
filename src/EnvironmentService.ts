import { VystaClient } from './VystaClient.js';

// In-memory cache for public environment variables
// This cache is cleared on page reload (browser refresh)
let cachedVariables: Record<string, any> | null = null;

export class EnvironmentService {
  constructor(private client: VystaClient) {}

  /**
   * Fetches public environment variables from the API endpoint.
   * Results are cached in memory for the current browser session.
   * Cache is automatically cleared on page reload.
   * @returns A promise that resolves to a record of public environment variables
   * @throws Error if the request fails or the response is not ok
   */
  async getVariables(): Promise<Record<string, any>> {
    // Return cached value if available
    if (cachedVariables !== null) {
      return cachedVariables;
    }

    // Build headers without authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Include X-DataVysta-Host header if configured
    const manualHost = this.client['auth']['manualHost'];
    if (manualHost) {
      headers['X-DataVysta-Host'] = manualHost;
    }

    // Build the URL
    const url = this.client.getBackendUrl('public/environment/variables');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch public environment variables: ${response.status} ${response.statusText}`);
      }

      const variables = await response.json();

      // Handle empty object response (valid case)
      const result = variables || {};

      // Cache the result
      cachedVariables = result;

      return result;
    } catch (error) {
      // Re-throw network errors with descriptive message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch public environment variables: ${String(error)}`);
    }
  }
}

