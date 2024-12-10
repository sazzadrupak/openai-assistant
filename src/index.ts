import dotenv from 'dotenv';
import { knowledgeRetrieval } from './knowledgeRetrieval';
// import express from 'express';
// import routes from './routes';

dotenv.config();

// const app: express.Application = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static('public'));

// app.use('/', routes);

// const port: number = 3000;

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

// Knowledge retrieval
knowledgeRetrieval();
