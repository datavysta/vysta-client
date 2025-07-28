import { VystaClient, VystaWorkflowService } from '../../src/index.js';

export interface InputTestInput {
  test: string;
}

export class WorkflowService extends VystaWorkflowService {
  constructor(client: VystaClient) {
    super(client);
  }

  async inputTest(input: InputTestInput): Promise<void> {
    return this.executeWorkflow<InputTestInput, void>('InputTest', input);
  }

  async inputTestAsync(input: InputTestInput): Promise<string> {
    return this.executeWorkflowAsync<InputTestInput>('InputTest', input);
  }

  async plainWait(): Promise<void> {
    return this.executeWorkflow('PlainWait');
  }

  async plainWaitAsync(): Promise<string> {
    return this.executeWorkflowAsync('PlainWait');
  }
}
