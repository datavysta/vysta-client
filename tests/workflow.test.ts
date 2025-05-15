import { describe, it, expect, beforeAll } from '@jest/globals';

// Import the actual service and types from examples
import { WorkflowService, InputTestInput } from '../examples/workflows/services';
import { createTestClient, authenticateClient } from './setup';
import { VystaClient } from '../src/VystaClient';

describe('VystaWorkflowService (using example workflows)', () => {
  const client: VystaClient = createTestClient();
  let workflows: WorkflowService;

  beforeAll(async () => {
    await authenticateClient(client);
    workflows = new WorkflowService(client);
  });

  describe('Workflow Operations', () => {
    it('should execute "InputTest" workflow with input', async () => {
      const input: InputTestInput = { test: 'test value' };
      await expect(workflows.inputTest(input)).resolves.not.toThrow();
    }, 10000);

    it('should execute "PlainWait" workflow without input', async () => {
      await expect(workflows.plainWait()).resolves.not.toThrow();
    }, 10000);

    it('should fail with an invalid workflow name', async () => {
      // Test executing a non-existent workflow via the protected base method
      await expect(
        (workflows as any).executeWorkflow('NonExistentWorkflowForSure'),
      ).rejects.toThrow();
    }, 10000);

    it('should execute "InputTest" workflow asynchronously and return a job ID', async () => {
      const input: InputTestInput = { test: 'test_async' };
      const jobId = await workflows.inputTestAsync(input);
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);
    });

    it('should execute "PlainWait" workflow asynchronously and return a job ID', async () => {
      const jobId = await workflows.plainWaitAsync();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);
    });
  });
});
