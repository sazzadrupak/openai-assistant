export interface AxiosResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
}
export interface Content {
  type: string;
  text: {
    value: string;
    annotations: [];
  };
}

export interface NewsArticle {
  title: string;
  author: string;
  source: {
    name: string;
  };
  description: string;
  url: string;
  content: string;
}
