import express from 'express';
import AssistantManager from '../assistantManager';
import { Role } from '../types';
const router = express.Router();

// Route for the form
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <title>OpenAI Assistant API</title>
    </head>
    <body>
        <div class="container mt-5">
            <h1>Submit Your Information</h1>
            <form action="/submit" method="POST" class="mt-3">
                <div class="mb-3">
                    <label for="userInput" class="form-label">Enter Topic</label>
                    <input type="text" id="topic" name="topic" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary">Run Assistant</button>
            </form>
        </div>
    </body>
    </html>
  `);
});

// Handle form submission
router.post('/submit', async (req, res) => {
  try {
    const instructions = req.body.topic;
    const manager = await AssistantManager.create();
    await manager.createAssistant(
      'News Summarizer',
      // eslint-disable-next-line max-len
      "You are a personal article summarizer Assistant who knows how to take a list of article's titles and descriptions and then write a short summary of all the news articles",
      [
        {
          type: 'function',
          function: {
            name: 'getNews',
            description: 'Get the list of articles/news for the given topic',
            parameters: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'The topic of the news',
                },
              },
              required: ['topic'],
            },
          },
        },
      ]
    );
    await manager.createThread();

    await manager.addMessageToThread(
      Role.USER,
      `summarize the news on this topic ${instructions}?`
    );

    await manager.runAssistant(
      'Please call the getNews function to get the list of articles/news for the given topic'
    );

    await manager.waitForRunCompletion();

    await manager.processMessage();

    const summary = await manager.getSummary();
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <title>OpenAI Assistant API</title>
    </head>
    <body>
      <div class="container mt-5">
        <h1>Thank you! You submitted: ${instructions}</h1>
        <section>${summary}</section>
      </div>
    </body>
    </html>
  `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
