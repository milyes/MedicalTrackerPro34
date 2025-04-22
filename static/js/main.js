document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('pdf-upload');
    const uploadInfo = document.getElementById('upload-info');
    const filenameDisplay = document.getElementById('filename-display');
    const clearFileButton = document.getElementById('clear-file');
    const analyzeButton = document.getElementById('analyze-button');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const sendCommandButton = document.getElementById('send-command');
    const cmdSound = document.getElementById('cmd-sound');
    const currentTimeDisplay = document.getElementById('current-time');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrContent = document.getElementById('ocr-content');
    const pagesNav = document.getElementById('pages-nav');
    const currentPageDisplay = document.getElementById('current-page');
    const totalPagesDisplay = document.getElementById('total-pages');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    
    // State variables
    let currentFile = null;
    let ocrResults = [];
    let currentPage = 1;
    
    // Set current time
    updateTime();
    setInterval(updateTime, 60000); // Update time every minute
    
    // Initialize dropzone
    initializeDropzone();
    
    // Initialize file input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Initialize clear file button
    clearFileButton.addEventListener('click', clearFile);
    
    // Initialize analyze button
    analyzeButton.addEventListener('click', analyzeFile);
    
    // Initialize terminal
    terminalInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendCommand();
        }
    });
    
    sendCommandButton.addEventListener('click', sendCommand);
    
    // Initialize page navigation
    prevPageButton.addEventListener('click', () => navigatePages('prev'));
    nextPageButton.addEventListener('click', () => navigatePages('next'));
    
    // Functions
    function updateTime() {
        const now = new Date();
        const formattedTime = now.toISOString().replace('T', ' ').substring(0, 19);
        currentTimeDisplay.textContent = formattedTime;
    }
    
    function initializeDropzone() {
        // Handle drag and drop events
        dropzone.addEventListener('dragover', function(event) {
            event.preventDefault();
            dropzone.classList.add('dropzone-active');
        });
        
        dropzone.addEventListener('dragleave', function() {
            dropzone.classList.remove('dropzone-active');
        });
        
        dropzone.addEventListener('drop', function(event) {
            event.preventDefault();
            dropzone.classList.remove('dropzone-active');
            
            if (event.dataTransfer.files.length) {
                const file = event.dataTransfer.files[0];
                if (file.type === 'application/pdf') {
                    processSelectedFile(file);
                } else {
                    addTerminalLine('system', 'Erreur: Seuls les fichiers PDF sont acceptés.');
                }
            }
        });
        
        // Click to browse files
        dropzone.addEventListener('click', function() {
            fileInput.click();
        });
    }
    
    function handleFileSelect(event) {
        if (event.target.files.length) {
            const file = event.target.files[0];
            if (file.type === 'application/pdf') {
                processSelectedFile(file);
            } else {
                addTerminalLine('system', 'Erreur: Seuls les fichiers PDF sont acceptés.');
            }
        }
    }
    
    function processSelectedFile(file) {
        // Update UI to show selected file
        currentFile = file;
        filenameDisplay.textContent = file.name;
        uploadInfo.classList.remove('hidden');
        dropzone.classList.add('hidden');
        analyzeButton.disabled = false;
        analyzeButton.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Add to terminal output
        addTerminalLine('system', `Fichier PDF sélectionné: ${file.name}`);
    }
    
    function clearFile() {
        currentFile = null;
        fileInput.value = '';
        uploadInfo.classList.add('hidden');
        dropzone.classList.remove('hidden');
        analyzeButton.disabled = true;
        analyzeButton.classList.add('opacity-50', 'cursor-not-allowed');
        
        // Reset OCR results
        ocrResults = [];
        resetOcrView();
        
        // Add to terminal output
        addTerminalLine('system', 'Fichier effacé.');
    }
    
    function resetOcrView() {
        ocrContent.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-[#a3b1d1]">
                <i class="fas fa-file-alt text-3xl mb-3"></i>
                <p>Aucun résultat d'OCR à afficher</p>
                <p class="text-xs mt-2">Uploadez un PDF pour lancer l'analyse</p>
            </div>
        `;
        
        pagesNav.classList.add('hidden');
        
        ocrStatus.innerHTML = `
            <div class="h-3 w-3 rounded-full bg-[#1a2a4a]"></div>
            <span>Aucune analyse en cours</span>
        `;
    }
    
    async function analyzeFile() {
        if (!currentFile) return;
        
        // Update UI to show loading
        analyzeButton.disabled = true;
        analyzeButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Analyse en cours...</span>';
        
        ocrStatus.innerHTML = `
            <div class="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
            <span>Analyse en cours...</span>
        `;
        
        addTerminalLine('system', `Lancement de l'analyse OCR sur ${currentFile.name}`);
        
        try {
            // Create FormData and send file to server
            const formData = new FormData();
            formData.append('pdf_file', currentFile);
            
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Process results
            ocrResults = data.results;
            currentPage = 1;
            
            // Update UI with results
            updateOcrView();
            
            // Update terminal
            addTerminalLine('system', `Analyse OCR terminée. ${ocrResults.length} pages analysées.`);
            playSound();
            
        } catch (error) {
            console.error('Error analyzing file:', error);
            addTerminalLine('system', `Erreur: ${error.message}`);
            
            ocrStatus.innerHTML = `
                <div class="h-3 w-3 rounded-full bg-red-500"></div>
                <span>Erreur: ${error.message}</span>
            `;
        } finally {
            // Reset button state
            analyzeButton.disabled = false;
            analyzeButton.innerHTML = '<i class="fas fa-robot"></i><span>Lancer l\'analyse OCR</span>';
        }
    }
    
    function updateOcrView() {
        if (ocrResults.length === 0) {
            resetOcrView();
            return;
        }
        
        // Update status
        ocrStatus.innerHTML = `
            <div class="h-3 w-3 rounded-full bg-green-500"></div>
            <span>Analyse complétée</span>
        `;
        
        // Update navigation
        pagesNav.classList.remove('hidden');
        currentPageDisplay.textContent = currentPage;
        totalPagesDisplay.textContent = ocrResults.length;
        
        // Update navigation buttons
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === ocrResults.length;
        
        // Display current page content
        const pageData = ocrResults[currentPage - 1];
        ocrContent.innerHTML = `
            <div class="page-content">
                <div class="mb-2 text-cyan-400 border-b border-cyan-900 pb-1">
                    Page ${pageData.page}
                </div>
                <div class="whitespace-pre-line">
                    ${pageData.text || 'Aucun texte détecté sur cette page.'}
                </div>
            </div>
        `;
    }
    
    function navigatePages(direction) {
        if (direction === 'prev' && currentPage > 1) {
            currentPage--;
        } else if (direction === 'next' && currentPage < ocrResults.length) {
            currentPage++;
        }
        
        updateOcrView();
        playSound();
    }
    
    function sendCommand() {
        const command = terminalInput.value.trim();
        if (!command) return;
        
        // Add user input to terminal
        addTerminalLine('user', command);
        
        // Clear input field
        terminalInput.value = '';
        
        // Play sound
        playSound();
        
        // Process command
        processCommand(command);
    }
    
    async function processCommand(command) {
        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: command })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display AI response
            addTerminalLine('ai', data.response);
            
        } catch (error) {
            console.error('Error processing command:', error);
            addTerminalLine('system', `Erreur: ${error.message}`);
        }
    }
    
    function addTerminalLine(type, text) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        
        let prefix, cssClass;
        
        switch (type) {
            case 'user':
                prefix = '>';
                cssClass = 'user-input';
                break;
            case 'ai':
                prefix = 'JANEWAY:';
                cssClass = 'ai-response';
                break;
            case 'system':
                prefix = 'system:';
                cssClass = 'text-cyan-400';
                break;
            default:
                prefix = '';
                cssClass = '';
        }
        
        line.innerHTML = `<span class="${cssClass}">${prefix}</span> ${text}`;
        terminalOutput.appendChild(line);
        
        // Auto-scroll to bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
    
    function playSound() {
        cmdSound.currentTime = 0;
        cmdSound.play().catch(error => {
            console.log('Audio playback prevented:', error);
        });
    }
});
