import { pc } from '../config/pineconeClient.js';
import { CohereClient } from 'cohere-ai';
import { classifyIntent } from '../utils/intentClassification.js';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

const contactDetails = "You can reach us at contact@tekrevol.com or call us at +123-456-7890.";

export const getChatbotResponse = async (query, maxLines = 20) => {
    try {
        const cohereEmbedResponse = await cohere.embed({
            texts: [query],
            model: 'embed-english-v2.0'
        });

        const queryEmbedding = cohereEmbedResponse.embeddings[0];
        console.log('Query Embedding:', queryEmbedding);

        const pineconeIndex = pc.Index(process.env.PINECONE_INDEX_NAME).namespace('default');
        const results = await pineconeIndex.query({
            topK: 5,
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        });

        console.log('Query Results:', results);

        if (!results.matches || results.matches.length === 0) {
            return `Unfortunately, I couldn't find any information related to your query. If you have further questions, feel free to contact us. ${contactDetails}`;
        }

        const scoreThreshold = 0.3;
        const relevantMatches = results.matches.filter(match => match.score >= scoreThreshold);

        console.log('Relevant Matches:', relevantMatches);

        if (relevantMatches.length === 0) {
            return `It seems we don't have an answer to your question right now. Please reach out to us for more details. ${contactDetails}`;
        }

        let retrievedContext = relevantMatches.map(match => match.metadata.text || '').join(' ');

        retrievedContext = retrievedContext.split(' ').slice(0, 1500).join(' ');

        const prompt = `You are a knowledgeable assistant for TekRevol. Use the context provided below to answer the question accurately. Start the answer with "TekRevol provides comprehensive mobile app development services, which likely include the following:" if the query is about their services. If the context is insufficient, mention that TekRevol offers various services and encourage the user to contact TekRevol for more information.

Context:
${retrievedContext}

Question:
${query}

Answer (start with "TekRevol provides comprehensive mobile app development services, which likely include the following:" if it's related to services, otherwise provide the most accurate answer based on the context):`;

        let generationResponse = await cohere.generate({
            model: 'command-xlarge-nightly',
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.5,
            stop_sequences: ["\n"],
        });

        if (generationResponse && generationResponse.generations && generationResponse.generations.length > 0) {
            let generatedText = generationResponse.generations[0].text.trim();

            if (!generatedText.endsWith('.') && generatedText.length > 0) {
                console.log('Detected incomplete response, attempting to continue the generation...');

                const continuationPrompt = `${prompt}${generatedText}`;
                const continuationResponse = await cohere.generate({
                    model: 'command-xlarge-nightly',
                    prompt: continuationPrompt,
                    max_tokens: 300,
                    temperature: 0.5,
                    stop_sequences: ["\n"],
                });

                if (continuationResponse && continuationResponse.generations && continuationResponse.generations.length > 0) {
                    const continuationText = continuationResponse.generations[0].text.trim();
                    generatedText += ' ' + continuationText;
                }
            }

            if (!generatedText.startsWith("TekRevol provides comprehensive mobile app development services, which likely include the following:") && query.toLowerCase().includes("services")) {
                return `I'm sorry, I couldn't generate a specific answer for your query. Feel free to reach out to us for more assistance. ${contactDetails}`;
            }

            return generatedText;
        } else {
            console.error('Unexpected Cohere response:', generationResponse);
            return `Sorry, I was unable to generate a response. If you have further questions, please contact us. ${contactDetails}`;
        }
    } catch (error) {
        console.error('Error fetching response:', error);
        throw new Error(`Failed to fetch chatbot response. You can reach out to us for help. ${contactDetails}`);
    }
};
