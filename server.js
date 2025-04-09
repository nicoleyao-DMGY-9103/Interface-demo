// Backend code (Node.js + Express + Direct API Call)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = 3000;

// Directly set Hugging Face API key
const HF_API_KEY = process.env.HF_API_KEY || "YOUR_API_KEY_HERE";

// Configure file storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Ensure the uploads directory exists
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Add CORS headers to allow access from all origins
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Ensure correct parsing of form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file service
app.use(express.static('public'));

// Test endpoint to check if the server is working properly
app.get('/api/test', (req, res) => {
    console.log('Test request received');
    res.json({ status: 'ok', message: 'Server is working properly' });
});

// Convert WebM audio to WAV format (more compatible format)
async function convertToWav(inputPath) {
    const outputPath = inputPath + '.wav';
    
    return new Promise((resolve, reject) => {
        console.log(`Converting audio: ${inputPath} -> ${outputPath}`);
        
        // Convert to 16kHz, 16bit, mono WAV format
        exec(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`, (error) => {
            if (error) {
                console.error('Audio conversion failed:', error);
                reject(error);
                return;
            }
            console.log('Audio conversion successful');
            resolve(outputPath);
        });
    });
}

// Handle audio upload and transcription
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    let wavFilePath = null;
    
    try {
        if (!req.file) {
            console.log('No audio file received');
            return res.status(400).json({ error: 'No audio file received' });
        }

        console.log('Audio file received:', req.file);
        console.log('File type:', req.file.mimetype);
        console.log('File size:', req.file.size, 'bytes');

        const inputPath = req.file.path;
        
        // Convert to WAV format
        try {
            wavFilePath = await convertToWav(inputPath);
            console.log('Successfully converted to WAV format:', wavFilePath);
        } catch (conversionError) {
            console.error('Audio conversion failed:', conversionError);
            throw new Error('Audio format conversion failed');
        }
        
        console.log('Preparing to call Hugging Face API...');
        
        if (!fs.existsSync(wavFilePath)) {
            throw new Error(`WAV file does not exist: ${wavFilePath}`);
        }
        
        // Directly read the file as binary data
        const audioData = fs.readFileSync(wavFilePath);
        console.log('WAV file size:', audioData.length, 'bytes');
        
        // Use direct API call method to send binary data
        const response = await axios({
            method: 'POST',
            url: 'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'audio/wav'
            },
            data: audioData,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('API call successful, status code:', response.status);
        console.log('Response data:', response.data);

        if (!response.data || !response.data.text) {
            throw new Error('Invalid response from API');
        }

        // Return conversion result
        res.json({ 
            text: response.data.text,
            success: true,
            model: "whisper-large-v3",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Detailed error information:', error);
        
        // Return more detailed error information
        res.status(500).json({ 
            error: 'An error occurred during speech-to-text conversion',
            details: error.message,
            stack: error.stack
        });
    } finally {
        // Clean up temporary files
        try {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
                console.log('Cleaned up original file:', req.file.path);
            }
            if (wavFilePath && fs.existsSync(wavFilePath)) {
                fs.unlinkSync(wavFilePath);
                console.log('Cleaned up WAV file:', wavFilePath);
            }
        } catch (cleanupError) {
            console.error('Failed to clean up files:', cleanupError);
        }
    }
});

// Check if the port is occupied, if so, use another port
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Please visit http://localhost:${port} in your browser to use the application`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is already in use, trying port ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Error starting server:', err);
        }
    });
}

// Start the server
startServer(port);