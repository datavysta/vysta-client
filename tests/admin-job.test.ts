import { describe, it, expect, beforeAll } from '@jest/globals';

import { VystaAdminJobService } from '../src/VystaAdminJobService';
import { JobStatus } from '../src/types';
import { WorkflowService } from '../examples/workflows/services'; // Import example workflow service
import { createTestClient, authenticateClient } from './setup';
import { VystaClient } from '../src/VystaClient';

describe('VystaAdminJobService', () => {
  let client: VystaClient;
  let jobService: VystaAdminJobService;
  let workflowService: WorkflowService; // Add workflow service instance

  beforeAll(async () => {
    client = createTestClient();
    await authenticateClient(client);
    jobService = new VystaAdminJobService(client);
    workflowService = new WorkflowService(client); // Initialize workflow service
  });

  describe('getJobSummary', () => {
    it('should retrieve a summary for a job created by an async workflow', async () => {
      // 1. Start an asynchronous workflow to get a real jobId
      const jobId = await workflowService.plainWaitAsync(); // Using plainWaitAsync for simplicity
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);

      // 2. Immediately try to fetch the job summary
      // Add a small delay to allow the job to be registered if necessary, though often not needed.
      // await new Promise(resolve => setTimeout(resolve, 500)); // Optional: small delay

      try {
        const jobSummary = await jobService.getJobSummary(jobId);

        // 3. Assertions on the retrieved job summary
        expect(jobSummary).toBeDefined();
        expect(jobSummary.id).toBe(jobId);
        expect(jobSummary.status).toBeDefined();
        expect(Object.values(JobStatus)).toContain(jobSummary.status);

        // Optionally, assert that the status is likely a non-terminal one initially
        // This can be a bit racy depending on how fast the workflow executes
        // expect([
        //   JobStatus.ENQUEUED,
        //   JobStatus.PROCESSING,
        //   JobStatus.SCHEDULED,
        // ]).toContain(jobSummary.status);

        // If the workflow is very short, it might even be SUCCEEDED quickly.
        // For a robust test, just checking it's a valid status and ID matches is good.
      } catch (error) {
        console.error(`Failed to get job summary for ${jobId}:`, error);
        // Re-throw the error to make the test fail if the summary couldn't be fetched
        // (e.g., if the job ID wasn't found, which would be unexpected here)
        throw error;
      }
    }, 15000); // Increased timeout to allow for workflow execution and job summary retrieval
  });
});
