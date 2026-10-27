declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly VITE_API_URL?: string;
  }
  
  type Timeout = ReturnType<typeof setTimeout>;
}
