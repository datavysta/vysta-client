import { VystaClient } from './VystaClient.js';
import { AuditRequest, AuditResponse, AuditRecord, ParsedAuditRecord, AuditFieldChange } from './types.js';

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
    const path = `rest/connections/${encodeURIComponent(connectionName)}/${encodeURIComponent(objectName)}/audit${queryString ? `?${queryString}` : ''}`;
    
    return this.client.post(path, primaryKeys) as Promise<AuditResponse>;
  }

  /**
   * Gets audit history for a specific row with parsed changedFields
   * @param connectionName - The name of the database connection
   * @param objectName - The name of the table/object
   * @param primaryKeys - Object containing primary key field names and values
   * @param options - Optional parameters for limit and offset
   * @returns A promise that resolves to parsed audit records with typed changedFields
   */
  async getTableAuditParsed(
    connectionName: string,
    objectName: string,
    primaryKeys: AuditRequest,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ParsedAuditRecord[]> {
    const response = await this.getTableAudit(connectionName, objectName, primaryKeys, options);
    
    return response.results.map(record => this.parseAuditRecord(record));
  }

  /**
   * Parses an audit record's changedFields from JSON string to typed object
   * @param record - The audit record to parse
   * @returns Parsed audit record with typed changedFields
   */
  parseAuditRecord(record: AuditRecord): ParsedAuditRecord {
    let changedFields: Record<string, AuditFieldChange> = {};
    
    try {
      if (record.changedFields && typeof record.changedFields === 'string') {
        changedFields = JSON.parse(record.changedFields);
      } else if (record.changedFields && typeof record.changedFields === 'object') {
        changedFields = record.changedFields as Record<string, AuditFieldChange>;
      }
    } catch (error) {
      console.error('Failed to parse audit changedFields:', error);
      changedFields = {};
    }

    return {
      ...record,
      changedFields
    };
  }

  /**
   * Helper method to parse changedFields JSON string into typed object
   * @param changedFieldsJson - JSON string of field changes
   * @returns Typed object with field changes
   */
  static parseChangedFields(changedFieldsJson: string): Record<string, AuditFieldChange> {
    try {
      return changedFieldsJson ? JSON.parse(changedFieldsJson) : {};
    } catch (error) {
      console.error('Failed to parse changedFields JSON:', error);
      return {};
    }
  }
}
