const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'public/placeholder-logo.png'),
    title: 'Inventory Control System',
    show: false, // Don't show until ready
  });

  // Hide menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load the app
  const startUrl = isDev 
    ? (process.env.ELECTRON_START_URL || 'http://localhost:3000')
    : `file://${path.join(__dirname, 'out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window
    // Developer tools disabled for cleaner desktop app experience
    // if (isDev) {
    //   mainWindow.webContents.openDevTools();
    // }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  if (isDev) {
    // In development, start Python backend using uvicorn
    const pythonScript = path.join(__dirname, 'backend', 'main.py');
    console.log('Starting Python backend in development mode...');
    
    pythonProcess = spawn('python', [pythonScript], {
      cwd: path.join(__dirname, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python Backend: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Backend Error: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python backend exited with code ${code}`);
      pythonProcess = null;
    });

    pythonProcess.on('error', (err) => {
      console.error(`Failed to start Python backend: ${err.message}`);
      pythonProcess = null;
    });

    return;
  }

  // In production, start the bundled Python backend
  const pythonExecutable = path.join(__dirname, 'backend', 'main.exe');
  
  if (require('fs').existsSync(pythonExecutable)) {
    pythonProcess = spawn(pythonExecutable);
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Backend Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python backend exited with code ${code}`);
    });
  }
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// Function to check if backend is ready
async function waitForBackend(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        console.log('Python backend is ready!');
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    
    console.log(`Waiting for backend... (${i + 1}/${retries})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error('Backend failed to start within timeout');
  return false;
}

// App event handlers
app.whenReady().then(async () => {
  startPythonBackend();
  
  // Wait for backend to be ready before creating window
  if (isDev) {
    const backendReady = await waitForBackend();
    if (!backendReady) {
      console.warn('Backend not ready, but continuing anyway in development mode');
    }
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopPythonBackend();
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});