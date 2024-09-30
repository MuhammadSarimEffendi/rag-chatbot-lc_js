import express from 'express';
import dotenv from 'dotenv';
import { testConnection } from './config/pineconeClient.js';
import fileRoutes from './routes/fileUpload.routes.js';
import { getChatbotResponse } from './services/chatbot.service.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test connections on startup
const testConnections = async () => {
    const pineconeConnected = await testConnection();
    console.log('pineconeConnected:', pineconeConnected);
    if (pineconeConnected) {
        console.log('All services are connected successfully.');
    } else {
        console.error('One or more services failed to connect.');
    }
};

// Use file upload routes
app.use('/api', fileRoutes); // Prefix your routes with `/api` if desired

app.post('/chat', async (req, res) => {
    const { query } = req.body; 

    if (!query) {
        return res.status(400).send('Query is required.');
    }

    try {
        const response = await getChatbotResponse(query);
        res.status(200).send(response);
    } catch (error) {
        console.error('Error fetching chatbot response:', error);
        res.status(500).send('Error fetching chatbot response.');
    }
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await testConnections();
});
