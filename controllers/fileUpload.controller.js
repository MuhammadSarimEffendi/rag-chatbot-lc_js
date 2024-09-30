import { processTextFile } from '../services/documentIngestion.service.js';

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const filePath = req.file.path;
        const originalFileName = req.file.originalname; 

        console.log(`Uploaded file path: ${filePath}`); 
        console.log(`Original file name: ${originalFileName}`); 

        const result = await processTextFile(filePath, originalFileName); 
        
        res.status(200).json({ message: result });
    } catch (error) {
        console.error('Error uploading file:', error); 
        res.status(500).json({ error: 'Failed to upload and process file' });
    }
};

const processFileFromPath = async (req, res) => {
    const { filePath } = req.query;  

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    try {
        const result = await processTextFile(filePath);
        res.status(200).json({ message: result });
    } catch (error) {
        console.error('Error processing file from path:', error); 
        res.status(500).json({ error: 'Failed to process the file at the given path' });
    }
};

export { uploadFile, processFileFromPath };
