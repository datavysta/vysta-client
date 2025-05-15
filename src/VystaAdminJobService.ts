import { VystaAdminService } from './base/VystaAdminService.js';
import { VystaClient } from './VystaClient.js';
import { JobSummary } from './types.js';

export class VystaAdminJobService extends VystaAdminService<JobSummary> {
  constructor(client: VystaClient) {
    // The endpoint is /api/admin/scheduling/jobsummary/id/{id}
    // VystaAdminService constructs the path as /api/{connectionName}/{tableName}
    // So, connectionName = 'admin/scheduling', tableName = 'jobsummary'
    super(client, 'admin/scheduling', 'jobsummary', { primaryKey: 'id' });
  }

  /**
   * Retrieves the summary for a specific job by its ID.
   * @param id The UUID of the job.
   * @returns A promise that resolves to the JobSummary.
   */
  async getJobSummary(id: string): Promise<JobSummary> {
    return this.getById(id);
  }
}
