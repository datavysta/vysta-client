import { describe, it, expect, beforeAll } from '@jest/globals';
import { VystaWorkflowService } from '../src/base/VystaWorkflowService';
import { createTestClient, authenticateClient } from './setup';

interface TestInput {
    test: string;
}

class TestWorkflowService extends VystaWorkflowService {
    constructor(client: any) {
        super(client);
    }

    async inputTest(input: TestInput): Promise<any> {
        return this.executeWorkflow<TestInput, any>('InputTest', input);
    }

    async plainWait(): Promise<void> {
        return this.executeWorkflow('PlainWait');
    }

    async twoWithWait(): Promise<void> {
        return this.executeWorkflow('Twowithwait');
    }

    async testInvalidWorkflow(): Promise<void> {
        return this.executeWorkflow('NonExistentWorkflow');
    }
}

describe('VystaWorkflowService', () => {
    const client = createTestClient();
    let workflows: TestWorkflowService;

    beforeAll(async () => {
        await authenticateClient(client);
        workflows = new TestWorkflowService(client);
    });

    describe('Workflow Operations', () => {
        it('should execute workflow with input', async () => {
            const input = { test: 'test value' };
            const results = await workflows.inputTest(input);
            await expect(results.message).toBe("Hi test value")
        }, 10000);

        it('should execute workflow without input', async () => {
            await expect(workflows.plainWait()).resolves.not.toThrow();
        }, 10000);

        it('should execute two workflows with wait', async () => {
            await expect(workflows.twoWithWait()).resolves.not.toThrow();
        }, 20000); // Longer timeout since this workflow runs two with wait

        it('should fail with invalid workflow name', async () => {
            await expect(workflows.testInvalidWorkflow()).rejects.toThrow();
        }, 10000);
    });
}); 