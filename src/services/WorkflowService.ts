import { VystaClient } from '../VystaClient.js';
import { VystaWorkflowService } from '../base/VystaWorkflowService.js';

export interface InputTestInput {
    oneString: string;
}

export class WorkflowService extends VystaWorkflowService {
    constructor(client: VystaClient) {
        super(client);
    }

    async inputTest(input: InputTestInput): Promise<void> {
        return this.executeWorkflow<InputTestInput, void>('InputTest', input);
    }

    async plainWait(): Promise<void> {
        return this.executeWorkflow('PlainWait');
    }
} 