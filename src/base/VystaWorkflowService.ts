import { VystaClient } from '../VystaClient';

export abstract class VystaWorkflowService {
    constructor(
        protected client: VystaClient
    ) {}

    protected async executeWorkflow<TInput = void, TOutput = void>(
        workflowName: string,
        input?: TInput
    ): Promise<TOutput> {
        const headers = await this.client['auth'].getAuthHeaders();
        const url = `${this.client['config'].baseUrl}/api/rest/workflows/${workflowName}`;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(input ?? {})
        });

        if (!response.ok) {
            throw new Error(`Workflow failed: ${response.statusText}`);
        }

        return response.json();
    }
} 