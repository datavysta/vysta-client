import { VystaClient } from '../../src/VystaClient';
import { VystaWorkflowService } from '../../src/base/VystaWorkflowService';

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

    async plainWait(): Promise<void> {
        return this.executeWorkflow('PlainWait');
    }
} 