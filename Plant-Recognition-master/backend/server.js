const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { fetch, Agent } = require('undici');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini API with custom Undici fetch to bypass Node's native fetch bug on certain networks
const customFetch = (url, init) => {
    return fetch(url, {
        ...init,
        dispatcher: new Agent({ connect: { timeout: 60000 } })
    });
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set. Please add it to your .env file.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { fetch: customFetch });

// Load local plant knowledge base
const localPlantData = JSON.parse(fs.readFileSync(path.join(__dirname, 'plant_data.json'), 'utf8'));

// Middleware
app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // unique filename
    }
});
const upload = multer({ storage: storage });

// Define the absolute path to the virtual environment python interpreter and script
// Taking advantage of path.resolve to go up one directory to access the model files
// Define the absolute path to the virtual environment python interpreter and script
// Taking advantage of path.resolve to go up one directory to access the model files
const pythonExecutable = process.env.NODE_ENV === 'production' 
    ? 'python3' 
    : path.resolve(__dirname, '..', 'venv_plant', 'Scripts', 'python.exe');
const scriptPath = path.resolve(__dirname, '..', 'predict.py');
const cwdPath = path.resolve(__dirname, '..');

// Persistent Python background process (Model Server)
let pythonProcess = null;
let predictionQueue = [];
let isPythonBusy = false;

function startPythonProcess() {
    console.log("Starting persistent Python model server...");
    // The script is now expected to run continuously and read image paths from stdin
    pythonProcess = spawn(pythonExecutable, [scriptPath], { cwd: cwdPath });

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`Python Output: ${output}`);
        if (predictionQueue.length > 0) {
            const { resolve, reject } = predictionQueue.shift();
            try {
                // Find the JSON line
                const lines = output.split('\n');
                let parsed = null;
                for (const line of lines) {
                    if (line.includes('"status"')) {
                        parsed = JSON.parse(line.trim());
                        break;
                    }
                }
                if (parsed) resolve(parsed);
                else reject(new Error("No valid JSON in python output: " + output));
            } catch (e) {
                reject(e);
            }
        }
        isPythonBusy = false;
        processQueue();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        console.warn(`Python process exited with code ${code}. Restarting...`);
        pythonProcess = null;
        isPythonBusy = false;
        // Reject any pending requests in the queue
        while (predictionQueue.length > 0) {
            const { reject } = predictionQueue.shift();
            reject(new Error("Python process exited unexpectedly."));
        }
        // Immediate restart
        setTimeout(startPythonProcess, 1000);
    });

    pythonProcess.on('error', (err) => {
        console.error(`Failed to start Python process: ${err.message}`);
        pythonProcess = null;
        isPythonBusy = false;
        while (predictionQueue.length > 0) {
            const { reject } = predictionQueue.shift();
            reject(new Error("Failed to start Python process."));
        }
        setTimeout(startPythonProcess, 5000); // Longer delay on initial error
    });
}

function processQueue() {
    if (predictionQueue.length > 0 && !isPythonBusy && pythonProcess && pythonProcess.stdin.writable) {
        isPythonBusy = true;
        const { imagePath } = predictionQueue[0];
        console.log(`Sending image path to Python: ${imagePath}`);
        pythonProcess.stdin.write(imagePath + '\n');
    } else if (!pythonProcess || !pythonProcess.stdin.writable) {
        console.warn("Python process not ready or not running. Cannot process queue.");
        // Potentially reject queued items if the process is truly down
    }
}

function getPrediction(imagePath) {
    return new Promise((resolve, reject) => {
        predictionQueue.push({ imagePath, resolve, reject });
        processQueue();
    });
}

// Initial start
startPythonProcess();

app.post('/predict', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;
    const aiMode = req.body.aiMode === 'true';
    console.log(`Processing image: ${imagePath} | aiMode: ${aiMode}`);

    let localResult = null;

    // AI ONLY MODE: Use Gemini Vision to identify the image (NO fallback to local model)
    if (aiMode) {
        try {
            console.log(`AI Mode enabled. Using Gemini Vision...`);
            const imageData = fs.readFileSync(imagePath);
            const base64Image = Buffer.from(imageData).toString("base64");
            const imagePart = { inlineData: { data: base64Image, mimeType: req.file.mimetype } };
            const prompt = `Analyze this image carefully and identify what it shows. 
If it is a plant or leaf, identify the plant name and provide its medicinal uses and treatable diseases.
If it is NOT a plant (for example a body part, X-ray, animal, object, food, etc.), identify what it actually is.

Return ONLY valid JSON in this exact format:
{"prediction": "Name of plant or object identified", "confidence": 1.0, "medicinalDetails": {"scientific_name": "scientific name if plant, or description if not a plant", "uses": ["use 1", "use 2"], "diseases": ["disease 1", "disease 2"]}}

If the image is not a plant, set uses to descriptions of what the image shows, and diseases to an empty array.`;

            const geminiResult = await model.generateContent([prompt, imagePart]);
            const responseText = geminiResult.response.text();
            const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
            const aiData = JSON.parse(cleanJson);
            if (aiData.confidence === undefined) aiData.confidence = 1.0;

            fs.unlink(imagePath, () => { });
            return res.json(aiData);
        } catch (e) {
            console.error("Gemini Vision Error:", e.message);
            fs.unlink(imagePath, () => { });
            return res.status(500).json({ 
                error: 'Gemini Vision failed. The API key may have exceeded its quota. Please try again later or switch to Local Model mode.',
                details: e.message 
            });
        }
    }

    // LOCAL MODEL FLOW (Shared by local mode and AI fallback)
    try {
        const parsedResult = await getPrediction(imagePath);

        // Clean up the uploaded image
        fs.unlink(imagePath, (err) => {
            if (err) console.error(`Failed to delete temporary image: ${err}`);
        });

        if (parsedResult.status === 'error') {
            throw new Error(parsedResult.message);
        }

        const plantKey = parsedResult.prediction;
        const plantName = plantKey.replace(/_/g, ' ');
        console.log(`Model predicted: ${plantName}. Checking local database...`);

        // Get medicinal data (Local preferred)
        let geminiData = localPlantData[plantKey] || localPlantData[plantName];

        if (!geminiData) {
            console.log(`Plant '${plantName}' not found in local database. Using default message.`);
            geminiData = { uses: ["Medicinal details not available in local database for this plant."], diseases: ["Not available"] };
        }

        res.json({
            ...parsedResult,
            medicinalDetails: geminiData
        });
    } catch (e) {
        console.error("Critical Execution Error:", e);
        // Ensure image is deleted even on error
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        res.status(500).json({ error: 'Failed to process model output', details: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
