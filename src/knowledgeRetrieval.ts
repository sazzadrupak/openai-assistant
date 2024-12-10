import dotenv from 'dotenv';
import fs from 'fs';
import OpenAIApi from 'openai';
import { Content, Role } from './types';

dotenv.config();

const model: string = 'gpt-4-turbo-preview';

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAIApi({
  apiKey: openaiApiKey,
});

export const knowledgeRetrieval = async () => {
  try {
    // const assistant = await openai.beta.assistants.create({
    //   name: 'Cryptocurrency Research Assistant',
    //   instructions: `You are a helpful study assistant who knows a lot about understanding research papers.
    //       Your role is to summarize papers, clarify terminology within context, and extract key figures and data.
    //       Cross-reference information for additional insights and answer related questions comprehensively.
    //       Analyze the papers, noting strengths and limitations.
    //       Respond to queries effectively, incorporating feedback to enhance your accuracy.
    //       Handle data securely and update your knowledge base with the latest research.
    //       Adhere to ethical standards, respect intellectual property, and provide users with guidance on any limitations.
    //       Maintain a feedback loop for continuous improvement and user support.
    //       Your ultimate goal is to facilitate a deeper understanding of complex scientific material,
    //       making it more accessible and comprehensible.`,
    //   model: model,
    //   tools: [{ type: 'file_search' }],
    // });
    const assistantId = 'asst_KOPkSdRFgtNrt9jn0Ed0OIch';
    console.log(`AssistantID:::: ${assistantId}`);

    const fileStreams = ['./cryptocurrency.pdf'].map((path) =>
      fs.createReadStream(path)
    );
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Cryptocurrency research Statement',
    });
    await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
      files: fileStreams,
    });

    await openai.beta.assistants.update(assistantId, {
      tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
    });

    // const thread = await openai.beta.threads.create({
    //   messages: [
    //     {
    //       role: 'user',
    //       content: 'What is mining?',
    //     },
    //   ],
    // });
    const threadId = 'thread_YM1FrWGJF3hzbKfk9II1JeTc';
    console.log(`ThreadID::: ${threadId}`);

    const content = 'What is mining?';
    await openai.beta.threads.messages.create(threadId, {
      role: Role.USER,
      content,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: 'Please address the user as Bruce',
    });

    await waitForRunCompletion(openai, threadId, run.id);

    const runSteps = await openai.beta.threads.runs.steps.list(
      threadId,
      run.id
    );
    console.log('Run steps \n', runSteps);
  } catch (error) {
    console.error('Error:', error);
  }
};

async function waitForRunCompletion(
  client: OpenAIApi,
  threadId: string,
  runId: string,
  sleepInterval: number = 10000
): Promise<void> {
  while (true) {
    const runStatus = await client.beta.threads.runs.retrieve(threadId, runId);
    if (runStatus.status === 'completed') {
      const elapsedTime = new Date(
        runStatus.completed_at! - runStatus.created_at
      );
      console.log('Run status: ', elapsedTime.toString());

      const messages = await client.beta.threads.messages.list(threadId);
      const { role, content } = messages.data[0];
      const { text } = content[0] as Content;
      const response = text.value;
      console.log(role.toUpperCase(), ' ', response);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, sleepInterval));
  }
}
