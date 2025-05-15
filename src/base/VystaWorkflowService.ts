import { VystaClient } from '../VystaClient';

export abstract class VystaWorkflowService {
  constructor(protected client: VystaClient) {}

  private async _executeWorkflowCore<TInput, TOutput>(
    workflowName: string,
    input?: TInput,
    isAsync: boolean = false,
  ): Promise<TOutput | string> {
    const headers = await this.client['auth'].getAuthHeaders();
    let url = `${this.client['config'].baseUrl}/api/rest/workflows/${workflowName}`;
    if (isAsync) {
      url += '/async';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input ?? {}),
    });

    if (!response.ok) {
      throw new Error(`Workflow failed: ${response.statusText}`);
    }

    const text = await response.text();

    if (isAsync) {
      if (!text) {
        throw new Error('Async workflow execution did not return a Job ID.');
      }
      return text;
    }

    if (!text) {
      return {} as TOutput;
    }
    return JSON.parse(text) as TOutput;
  }

  protected async executeWorkflow<TInput = void, TOutput = void>(
    workflowName: string,
    input?: TInput,
  ): Promise<TOutput> {
    return this._executeWorkflowCore<TInput, TOutput>(
      workflowName,
      input,
      false,
    ) as Promise<TOutput>;
  }

  protected async executeWorkflowAsync<TInput = void>(
    workflowName: string,
    input?: TInput,
  ): Promise<string> {
    return this._executeWorkflowCore<TInput, unknown>(workflowName, input, true) as Promise<string>;
  }
}
