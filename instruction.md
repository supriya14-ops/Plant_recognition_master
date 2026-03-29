# Plant Identification System Setup Instructions

This guide provides step-by-step instructions to set up and run the complete Plant Identification application (Python Machine Learning Model, Node.js Backend, and React Frontend) on a new system.

## Prerequisites

Before starting, ensure you have the following installed on your system:
- **Python** (3.8 or higher recommended) - [Download Python](https://www.python.org/downloads/)
- **Node.js** (18 or higher recommended) & npm - [Download Node.js](https://nodejs.org/)
- **Git** (optional, for cloning the repository)

## Step 1: Set up the Python Machine Learning Environment

The core of the application relies on a trained SVM model and feature extractor that run in an isolated Python Virtual Environment.

1. Open a terminal and navigate to the project root directory:
   ```bash
   cd path/to/Plant-Recognition-master
   ```

2. Create a new Python virtual environment:
   ```bash
   # On Windows:
   python -m venv venv
   
   # On macOS/Linux:
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # On Windows (Command Prompt):
   venv\Scripts\activate
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

4. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Ensure you remain in the project root where `predict.py`, `svm_model.joblib`, and `pso_feature_mask.npy` are located).*

## Step 2: Set up the Node.js Backend

The Express backend communicates with both the local Python model and the Gemini Vision API.

1. Open a **new terminal window** and navigate to the backend directory:
   ```bash
   cd path/to/Plant-Recognition-master/backend
   ```

2. Install the backend dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   node server.js
   ```
   *You should see a message indicating the server is running on `http://localhost:5000`.*

## Step 3: Set up the React Frontend

The beautifully styled Vite + React application serves as the user interface.

1. Open a **third terminal window** and navigate to the frontend directory:
   ```bash
   cd path/to/Plant-Recognition-master/frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm run dev
   ```
   *You should see a message indicating the Vite server is ready (usually on `http://localhost:5173`).*

## Step 4: Access the Application

1. Open your web browser.
2. Navigate to the URL provided by the Vite server (e.g., **http://localhost:5173**).
3. You can now use the application! 
   - Drag and drop an image of a leaf/plant into the dropzone.
   - Use the **Local Model** to run predictions through your pre-trained CNN + PSO + SVM pipeline (which also provides a Confidence Score).
   - Flip the toggle to **Gemini Vision** to bypass the local model and identify the plant purely using AI.
   - Both modes will automatically fetch and display **Medicinal Uses** and **Treatable Diseases**.

---

### Troubleshooting
- **Missing modules in Python?** Ensure your virtual environment is activated before running `pip install` or `predict.py` directly.
- **Port conflicts?** If ports 5000 (backend) or 5173 (frontend) are in use, modify them in `server.js` and `App.jsx` (fetch URL) respectively.
- **Backend can't find python executable?** Keep the folder structure completely intact. `server.js` dynamically looks for `../venv/Scripts/python.exe` relative to its execution path to run `predict.py`. If you're on Mac/Linux, you might need to change `python.exe` to `python` in `server.js` line 38.
