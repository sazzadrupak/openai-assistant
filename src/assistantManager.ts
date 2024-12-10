import Boom from '@hapi/boom';
import OpenAIApi from 'openai';
import { AssistantTool } from 'openai/resources/beta/assistants';
import { MessagesPage } from 'openai/resources/beta/threads/messages';
import {
  RequiredActionFunctionToolCall,
  Run,
} from 'openai/resources/beta/threads/runs/runs';
import { RunStep } from 'openai/resources/beta/threads/runs/steps';
import { getNews } from './newsApi';
import { Content, NewsArticle, Role } from './types';

const model: string = 'gpt-3.5-turbo-16k';

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAIApi({
  apiKey: openaiApiKey,
});

interface Assistant {
  id: string;
  name: string;
  // Add other properties as needed
}

interface Thread {
  id: string;
  // Add other properties as needed
}

class AssistantManager {
  private static assistantId: string | null = 'asst_dwVwNnhuuZSH2kWi5gC5VDt2';
  private static threadId: string | null = 'thread_ftAyg3mimxpt6Nm8a4qfwD1B';
  private assistant: Assistant | null = null;
  private thread: Thread | null = null;
  private run: Run | null = null;
  public summary: string = '';
  private client: OpenAIApi = openai;
  private model: string = model;

  constructor() {}

  private async initialize(): Promise<void> {
    console.log('Initializing AssistantManager...');
    if (AssistantManager.assistantId) {
      const retrieveAssistant = await this.client.beta.assistants.retrieve(
        AssistantManager.assistantId
      );
      if (retrieveAssistant && retrieveAssistant.name !== null) {
        this.assistant = retrieveAssistant as Assistant;
      }
    }
    if (AssistantManager.threadId) {
      const retrieveThread = await this.client.beta.threads.retrieve(
        AssistantManager.threadId
      );
      this.thread = retrieveThread as Thread;
    }
  }

  public static async create(): Promise<AssistantManager> {
    const manager = new AssistantManager();
    await manager.initialize();
    return manager;
  }

  public async createAssistant(
    name: string,
    instructions: string,
    tools: AssistantTool[]
  ): Promise<void> {
    if (!this.assistant) {
      const assistantObj = await this.client.beta.assistants.create({
        name,
        instructions,
        tools,
        model: this.model,
      });
      if (assistantObj && assistantObj.id !== null) {
        AssistantManager.assistantId = assistantObj.id;
        this.assistant = assistantObj as Assistant;
        console.log(`AssistantID:::: ${this.assistant.id}`);
      }
    }
  }

  public async createThread(): Promise<void> {
    if (!this.thread) {
      const threadObj = await this.client.beta.threads.create();
      AssistantManager.threadId = threadObj.id;
      this.thread = threadObj;
      console.log(`ThreadID::: ${this.thread.id}`);
    }
  }

  public async addMessageToThread(role: Role, content: string): Promise<void> {
    if (this.thread) {
      await this.client.beta.threads.messages.create(this.thread.id, {
        role,
        content,
      });
    } else {
      throw new Error('Thread is not initialized.');
    }
  }

  private async callRequiredFunctions(
    requiredActions: RequiredActionFunctionToolCall[]
  ): Promise<void> {
    if (!this.run || !this.thread) return;
    const toolOutputs = [];
    for (const action of requiredActions) {
      if (action.type === 'function') {
        const { topic } = JSON.parse(action.function.arguments);
        if (action.function.name === 'getNews') {
          try {
            const result: NewsArticle[] = await getNews(topic);
            const toolOutput = {
              tool_call_id: action.id,
              output: JSON.stringify(result),
            };
            toolOutputs.push(toolOutput);
          } catch (error) {
            console.log('Error in getNews: ', error);
            throw Boom.internal('Error in getNews');
          }
        } else {
          console.log(`Unknown function: ${action.function.name}`);
          throw Boom.internal('Unknown function');
        }
      }
    }
    console.log('Submitting outputs back to the Assistant...');
    await this.client.beta.threads.runs.submitToolOutputs(
      this.thread.id,
      this.run.id,
      { tool_outputs: toolOutputs }
    );
  }

  public async getSummary(): Promise<string> {
    return await new Promise((resolve) =>
      setTimeout(() => resolve(this.summary), 0)
    );
  }

  public async waitForRunCompletion(): Promise<void> {
    if (this.thread && this.run) {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        const runStatus = await this.client.beta.threads.runs.retrieve(
          this.thread.id,
          this.run.id
        );
        console.log('Run status: ', runStatus.status);
        if (runStatus.status === 'completed') {
          break;
        } else if (runStatus.status === 'requires_action') {
          console.log('Function Calling');
          const requiredActions =
            runStatus.required_action?.submit_tool_outputs.tool_calls;
          this.callRequiredFunctions(requiredActions!);
        } else {
          console.log('Waiting for the Assistant to process...');
        }
      }
    }
  }

  public async runAssistant(instructions: string): Promise<void> {
    if (this.thread && this.assistant) {
      this.run = await this.client.beta.threads.runs.create(this.thread.id, {
        assistant_id: this.assistant.id,
        instructions,
      });
      return;
    }
    throw new Error('Thread or Assistant is not initialized.');
  }

  public async processMessage(): Promise<void> {
    if (this.thread) {
      const messages: MessagesPage =
        await this.client.beta.threads.messages.list(this.thread.id);
      const { role, content } = messages.data[0];
      const { text } = content[0] as Content;
      const response = text.value;
      console.log(role.toUpperCase(), ' ', response);
      this.summary = response;
    }
  }

  /**
   * Represents the steps (model and tool calls) that the assistant has taken to respond to the user's request.
   */
  public async runSteps(): Promise<RunStep[] | undefined> {
    if (!this.thread || !this.run) {
      return;
    }
    const runStep = await this.client.beta.threads.runs.steps.list(
      this.thread.id,
      this.run.id
    );
    return runStep.data;
  }
}

export default AssistantManager;
