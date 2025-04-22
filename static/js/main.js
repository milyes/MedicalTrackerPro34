// Audio elements
let terminalSound = new Audio('/static/sounds/terminal.ogg');
let uploadSound = new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
let processSound = new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
let completeSound = new Audio('https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_success.ogg');
let errorSound = new Audio('https://actions.google.com/sounds/v1/cartoon/negative_tone.ogg');

// Terminal functionality
function sendMessage() {
    const input = document.getElementById("questionInput");
    const responseBox = document.getElementById("responseBox");
    const question = input.value.trim();
    
    if (!question) return;
    
    // Play sound effect
    terminalSound.currentTime = 0;
    terminalSound.play();
    
    // Add command to terminal history
    addToTerminal(`> ${question}`);
    
    // Clear input
    input.value = "";
    
    // Show loading indicator
    responseBox.innerHTML = `<div class="text-cyan-400">Traitement en cours<span class="animate-pulse">...</span></div>`;
    
    // Send to backend
    fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question }),
    })
    .then(res => res.json())
    .then(data => {
        // Format and display response
        responseBox.innerHTML = formatTerminalResponse(data.response);
    })
    .catch(err => {
        responseBox.innerHTML = `<div class="text-red-500">Erreur: ${err.message}</div>`;
        errorSound.play();
    });
}

// Add text to terminal history
function addToTerminal(text) {
    const terminal = document.getElementById("terminalHistory");
    terminal.innerHTML += `<div>${text}</div>`;
    terminal.scrollTop = terminal.scrollHeight;
}

// Format terminal response with syntax highlighting
function formatTerminalResponse(text) {
    // Basic formatting - replace newlines with <br>
    let formatted = text.replace(/\n/g, '<br>');
    
    // Highlight system commands and keywords
    formatted = formatted.replace(/\b(État|Commandes|Résultats OCR|Analyse|Page|Erreur)\b/g, 
        '<span class="text-cyan-400">$1</span>');
    
    // Add special formatting for command names
    formatted = formatted.replace(/\b(analyze|clear|status|help|show results)\b/g,
        '<span class="text-purple-400 font-semibold">$1</span>');
        
    return formatted;
}

// File upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('pdf-upload');
    const dropZone = document.querySelector('.border-dashed');
    const terminalOutput = document.getElementById('terminalOutput');
    
    if (uploadForm) {
        // Handle form submission
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!fileInput.files.length) {
                showMessage('Veuillez sélectionner un fichier PDF', 'error');
                errorSound.play();
                return;
            }
            
            const file = fileInput.files[0];
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                showMessage('Seuls les fichiers PDF sont acceptés', 'error');
                errorSound.play();
                return;
            }
            
            // Create FormData object
            const formData = new FormData();
            formData.append('pdf_file', file);
            
            // Show processing message
            showMessage('Analyse du document en cours...', 'processing');
            processSound.play();
            
            // Send to backend
            fetch('/process-pdf', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showMessage(data.message, 'success');
                    completeSound.play();
                    
                    // Add to terminal output
                    addToTerminal(`> Document analysé: ${file.name}`);
                    addToTerminal(`> Extraction OCR terminée`);
                    document.getElementById('responseBox').innerHTML = 
                        `<div class="text-green-400">Analyse terminée!</div>
                         <div class="mt-2">Prévisualisation: ${data.preview}</div>
                         <div class="mt-2">Tapez 'show results' pour afficher le texte complet</div>`;
                } else {
                    showMessage(data.message, 'error');
                    errorSound.play();
                }
            })
            .catch(error => {
                showMessage(`Erreur: ${error.message}`, 'error');
                errorSound.play();
            });
        });
        
        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('bg-[#2a4db8]', 'bg-opacity-20');
        }
        
        function unhighlight() {
            dropZone.classList.remove('bg-[#2a4db8]', 'bg-opacity-20');
        }
        
        dropZone.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length) {
                fileInput.files = files;
                uploadSound.play();
                document.querySelector('label[for="pdf-upload"]').textContent = files[0].name;
            }
        }
    }
    
    // Add event listener for Enter key in the terminal
    const questionInput = document.getElementById('questionInput');
    if (questionInput) {
        questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// Show message in UI
function showMessage(message, type) {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;
    
    let bgColor = '';
    let textColor = '';
    
    switch(type) {
        case 'error':
            bgColor = 'bg-red-900';
            textColor = 'text-red-200';
            break;
        case 'success':
            bgColor = 'bg-green-900';
            textColor = 'text-green-200';
            break;
        case 'processing':
            bgColor = 'bg-blue-900';
            textColor = 'text-blue-200';
            break;
        default:
            bgColor = 'bg-gray-900';
            textColor = 'text-gray-200';
    }
    
    messageBox.className = `${bgColor} ${textColor} p-3 rounded-md text-center mt-4`;
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000);
    }
}
