import Boom from '@hapi/boom';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

import { AxiosResponse, NewsArticle } from './types';

const newsApiKey = process.env.NEWS_API_KEY;

interface ApiResponse {
  status: 'string';
  totalResults: number;
  articles: NewsArticle[];
}

export const getNews = async (topic: string): Promise<NewsArticle[]> => {
  const url = `https://newsapi.org/v2/everything?q=${topic}&apiKey=${newsApiKey}&pageSize=5`;
  try {
    const response: AxiosResponse<ApiResponse> = await axios.get(url);
    if (response.status === 200) {
      const articles: NewsArticle[] = response.data.articles;
      const finalNews: NewsArticle[] = articles.map((article: NewsArticle) => ({
        title: article.title,
        author: article.author,
        source: article.source,
        description: article.description,
        url: article.url,
        content: article.content,
      }));

      return finalNews;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error occurred during API Request', error);
    throw Boom.internal('Error occurred during API Request');
  }
};
