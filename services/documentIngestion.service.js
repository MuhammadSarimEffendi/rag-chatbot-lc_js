import fs from 'fs/promises';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { pc } from '../config/pineconeClient.js';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

const readJsonContent = async (filePath) => {
    try {
        const absoluteFilePath = path.resolve(filePath); 
        await fs.access(absoluteFilePath); 
        const content = await fs.readFile(absoluteFilePath, 'utf8');
        const jsonData = JSON.parse(content);

        const extractTextFromJson = (data) => {
            let text = '';
            if (typeof data === 'object') {
                for (const key in data) {
                    text += extractTextFromJson(data[key]) + ' ';
                }
            } else if (typeof data === 'string') {
                text += data + ' ';
            }
            return text;
        };

        return extractTextFromJson(jsonData).trim();
    } catch (error) {
        throw new Error('Error reading JSON content: ' + error.message);
    }
};

// const readFileContent = async (filePath) => {
//     try {
//         const absoluteFilePath = path.resolve(filePath);
//         await fs.access(absoluteFilePath); 
//         const content = await fs.readFile(absoluteFilePath, 'utf8');
//         return content;
//     } catch (error) {
//         throw new Error('Error reading file content: ' + error.message);
//     }
// };

export const processTextFile = async (filePath, originalFileName, namespace = 'default') => {
    try {
        const index = pc.Index(process.env.PINECONE_INDEX_NAME);

        const fileExtension = path.extname(originalFileName).toLowerCase();

        let textContent = '';

        if (fileExtension === '.txt') {
            textContent = await fs.readFile(filePath, 'utf8');
        } else if (fileExtension === '.json') {
            textContent = await readJsonContent(filePath);
        } else {
            throw new Error('Unsupported file format. Only TXT and JSON files are supported.');
        }

        console.log(`Checking existing vectors in namespace "${namespace}"...`);
        const stats = await index.describeIndexStats({
            describeRequest: {
                namespace: namespace
            }
        });

        const existingVectorCount = stats.namespaces[namespace]?.vectorCount || 0;

        if (existingVectorCount > 0) {
            console.log(`Found ${existingVectorCount} existing vectors in namespace "${namespace}". Deleting them...`);
            await index.delete({
                deleteAll: true,
                namespace: namespace,
            });
            console.log(`Existing vectors deleted from namespace "${namespace}".`);
        } else {
            console.log(`No existing vectors found in namespace "${namespace}". Skipping deletion.`);
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500, 
            chunkOverlap: 200,
            separators: ['\n\n', '\n', ' ', ''],
        });

        const chunks = await splitter.createDocuments([textContent]);

        if (chunks.length === 0) {
            console.error('No text chunks were created from the file.');
            return;
        }

        const cohereEmbedResponse = await cohere.embed({
            texts: chunks.map(chunk => chunk.pageContent),
            model: 'embed-english-v2.0',
        });

        const embeddings = cohereEmbedResponse.embeddings;
        console.log(`Cohere API response received with ${embeddings.length} embeddings.`);

        if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
            console.error('No embeddings were returned from Cohere API.');
            return;
        }

        const vectors = chunks.map((chunk, i) => ({
            id: `doc-${i}`,
            values: embeddings[i],
            metadata: { text: chunk.pageContent },
        }));

        console.log(`Vectors to be upserted: ${vectors.length} vectors created for ${chunks.length} chunks.`);

        if (Array.isArray(vectors) && vectors.length > 0) {
            await index.namespace(namespace).upsert(vectors); 
            console.log(`Successfully processed and stored ${chunks.length} documents in namespace "${namespace}".`);
            return `Processed ${chunks.length} documents from the file.`;
        } else {
            console.error('No valid vectors to upsert.');
            return;
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw new Error('Failed to process and store the file.');
    }
};
