import { VystaClient } from './VystaClient.js';
import { AuditRequest, AuditResponse } from './types.js';

/**
 * Service for retrieving table audit history
 */
export class VystaTableAuditService {
  constructor(private client: VystaClient) {}

  /**
   * Gets audit history for a specific row in a table
   * @param connectionName - The name of the database connection
   * @param objectName - The name of the table/object
   * @param primaryKeys - Object containing primary key field names and values
   * @param options - Optional parameters for limit and offset
   * @returns A promise that resolves to an AuditResponse containing audit events
   */
  async getTableAudit(
    connectionName: string,
    objectName: string,
    primaryKeys: AuditRequest,
    options: { limit?: number; offset?: number } = {}
  ): Promise<AuditResponse> {
    const { limit = 20, offset = 0 } = options;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit !== undefined) queryParams.append('limit', limit.toString());
    if (offset !== undefined) queryParams.append('offset', offset.toString());
    
    const queryString = queryParams.toString();
    const path = `admin/dataservice/connection/${encodeURIComponent(connectionName)}/table/${encodeURIComponent(objectName)}/audit${queryString ? `?${queryString}` : ''}`;
    
    return this.client.post(path, primaryKeys) as Promise<AuditResponse>;
  }
}
