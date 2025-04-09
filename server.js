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
// For security, this should be stored in environment variables
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
    console.log('收到测试请求');
    res.json({ status: 'ok', message: '服务器正常工作' });
});

// Convert WebM audio to WAV format (more compatible format)
async function convertToWav(inputPath) {
    const outputPath = inputPath + '.wav';
    
    return new Promise((resolve, reject) => {
        console.log(`转换音频: ${inputPath} -> ${outputPath}`);
        
        // Convert to 16kHz, 16bit, mono WAV format
        exec(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`, (error) => {
            if (error) {
                console.error('转换音频失败:', error);
                reject(error);
                return;
            }
            console.log('音频转换成功');
            resolve(outputPath);
        });
    });
}

// Handle audio upload and transcription
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    let wavFilePath = null;
    
    try {
        if (!req.file) {
            console.log('未收到音频文件');
            return res.status(400).json({ error: '没有收到音频文件' });
        }

        console.log('收到音频文件:', req.file);
        console.log('文件类型:', req.file.mimetype);
        console.log('文件大小:', req.file.size, 'bytes');

        const inputPath = req.file.path;
        
        // Convert to WAV format
        try {
            wavFilePath = await convertToWav(inputPath);
            console.log('成功转换为WAV格式:', wavFilePath);
        } catch (conversionError) {
            console.error('音频转换失败:', conversionError);
            throw new Error('音频格式转换失败');
        }
        
        console.log('准备调用Hugging Face API...');
        
        if (!fs.existsSync(wavFilePath)) {
            throw new Error(`WAV文件不存在: ${wavFilePath}`);
        }
        
        // Directly read the file as binary data
        const audioData = fs.readFileSync(wavFilePath);
        console.log('WAV文件大小:', audioData.length, 'bytes');
        
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
        
        console.log('API调用成功，状态码:', response.status);
        console.log('响应数据:', response.data);

        if (!response.data || !response.data.text) {
            throw new Error('API返回的响应无效');
        }

        // Return conversion result
        res.json({ 
            text: response.data.text,
            success: true,
            model: "whisper-large-v3",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('详细错误信息:', error);
        
        // Return more detailed error information
        res.status(500).json({ 
            error: '语音转文字过程中发生错误',
            details: error.message,
            stack: error.stack
        });
    } finally {
        // Clean up temporary files
        try {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
                console.log('清理原始文件:', req.file.path);
            }
            if (wavFilePath && fs.existsSync(wavFilePath)) {
                fs.unlinkSync(wavFilePath);
                console.log('清理WAV文件:', wavFilePath);
            }
        } catch (cleanupError) {
            console.error('清理文件失败:', cleanupError);
        }
    }
});

// Check if the port is occupied, if so, use another port
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
        console.log(`请在浏览器中访问 http://localhost:${port} 来使用应用`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('启动服务器出错:', err);
        }
    });
}

// Start the server
startServer(port);