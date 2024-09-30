import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const testConnection = async () => {
  try {
    const indices = await pc.listIndexes();
    console.log('Connected to Pinecone successfully. Available indices:', indices);
    return true;
  } catch (error) {
    console.error('Error connecting to Pinecone:', error);
  }
};

// testConnection();

export { pc , testConnection};
