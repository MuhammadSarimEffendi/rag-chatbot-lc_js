import { pc } from '../config/pineconeClient.js';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

const contactDetails = "You can reach us at contact@tekrevol.com or call us at +123-456-7890.";

export const getChatbotResponse = async (query, maxLines = 20) => {
    try {
        const startTime = Date.now();

        const cohereEmbedResponse = await cohere.embed({
            texts: [query],
            model: 'embed-english-v2.0'
        });

        const queryEmbedding = cohereEmbedResponse.embeddings[0];
        console.log('Query Embedding:', queryEmbedding);

        const scoreThreshold = 0.4; 
        const pineconeIndex = pc.Index(process.env.PINECONE_INDEX_NAME).namespace('default');
        const results = await pineconeIndex.query({
            topK: 5,  
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        });

        console.log('Query Results:', results);

        if (!results.matches || results.matches.length === 0) {
            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`); 
            return `I couldn't find any information related to your query. Please reach out to us for further assistance. ${contactDetails}`;
        }

        const relevantMatches = results.matches.filter(match => match.score >= scoreThreshold);
        console.log('Relevant Matches:', relevantMatches);

        if (relevantMatches.length === 0) {
            const endTime = Date.now(); 
            console.log(`Response time: ${endTime - startTime}ms`);
            return `It seems we don't have enough relevant information to answer your question. Please reach out to us for more details. ${contactDetails}`;
        }

        let retrievedContext = relevantMatches.map(match => match.metadata.text || '').join(' ');
        
        if (!retrievedContext || retrievedContext.trim().length < 50) {
            const endTime = Date.now(); 
            console.log(`Response time: ${endTime - startTime}ms`);
            return `The available context is insufficient to provide a meaningful answer. Please contact us for further assistance. ${contactDetails}`;
        }

        retrievedContext = retrievedContext.split(' ').slice(0, 1500).join(' ');

        const prompt = `Assistant for the "Hair Dash" project. Answer questions based on the following context:

Context:
${retrievedContext}

Question:
${query}

Answer (focus on project features and functionalities, and do not give a general or unrelated response):`;

        let maxOutputTokens = query.length > 100 ? 900 : 700;
        
        let generationResponse = await cohere.generate({
            model: 'command-xlarge-nightly',
            prompt: prompt,
            max_tokens: maxOutputTokens,  
            temperature: 0.5,
            stop_sequences: ["\n"],
        });

        if (generationResponse && generationResponse.generations && generationResponse.generations.length > 0) {
            let generatedText = generationResponse.generations[0].text.trim();

            while (!generatedText.endsWith('.') && generatedText.length > 0 && generatedText.split(' ').length < maxLines * 2) {
                console.log('Detected incomplete response, attempting to continue the generation...');

                const continuationPrompt = `${prompt}${generatedText}`;
                const continuationResponse = await cohere.generate({
                    model: 'command-xlarge-nightly',
                    prompt: continuationPrompt,
                    max_tokens: 700,
                    temperature: 0.5,
                    stop_sequences: ["\n"],
                });

                if (continuationResponse && continuationResponse.generations && continuationResponse.generations.length > 0) {
                    const continuationText = continuationResponse.generations[0].text.trim();
                    generatedText += ' ' + continuationText;

                    if (generatedText.endsWith('.')) {
                        break;
                    }
                } else {
                    console.error('Unexpected Cohere response during continuation:', continuationResponse);
                    break;
                }
            }

            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`); 

            return generatedText;
        } else {
            console.error('Unexpected Cohere response:', generationResponse);
            const endTime = Date.now(); 
            console.log(`Response time: ${endTime - startTime}ms`); 
            return `Sorry, I couldn't generate a relevant response to your query. If you have further questions, please contact us. ${contactDetails}`;
        }
    } catch (error) {
        console.error('Error fetching response:', error);
        throw new Error(`Failed to fetch chatbot response. Please reach out to us for assistance. ${contactDetails}`);
    }
};
