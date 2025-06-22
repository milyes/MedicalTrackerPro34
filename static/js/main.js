// Audio elements
let terminalSound = new Audio('/static/sounds/terminal.ogg');
let uploadSound = new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
let processSound = new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
let completeSound = new Audio('https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_success.ogg');
let errorSound = new Audio('https://actions.google.com/sounds/v1/cartoon/negative_tone.ogg');

// Terminal functionality
function sendMessage(predefinedCommand = null) {
    const input = document.getElementById("questionInput");
    const responseBox = document.getElementById("responseBox");
    const question = predefinedCommand || input.value.trim();
    
    if (!question) return;
    
    // Play sound effect
    terminalSound.currentTime = 0;
    terminalSound.play();
    
    // Add command to terminal history
    addToTerminal(`> ${question}`);
    
    // Clear input (only if not predefined command)
    if (!predefinedCommand) {
        input.value = "";
    }
    
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
        
        // Handle special actions
        if (data.export_ready) {
            addToTerminal(`> Export prêt: ${data.filename}`);
            // Auto-download the export
            window.open('/export-text', '_blank');
        }
        
        if (data.download_action) {
            window.open('/export-text', '_blank');
        }
        
        if (data.qr_action) {
            generateQRCode();
        }
        
        if (data.show_pages && data.pages_data) {
            showDynamicPageViewer(data.pages_data);
        }
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

// Show Dynamic Page Viewer
function showDynamicPageViewer(pagesData) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    
    let currentPage = 0;
    
    const updatePageContent = () => {
        const page = pagesData[currentPage];
        const pageContent = document.getElementById('dynamic-page-content');
        const pageInfo = document.getElementById('dynamic-page-info');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        
        if (pageContent && pageInfo && page) {
            pageContent.textContent = page.content || 'Aucun texte détecté sur cette page';
            pageInfo.innerHTML = `
                <div class="flex justify-between items-center text-sm">
                    <span>Page ${page.page_number} / ${pagesData.length}</span>
                    <span>${page.char_count} caractères</span>
                </div>
            `;
            
            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = currentPage === pagesData.length - 1;
            
            prevBtn.className = currentPage === 0 ? 
                'bg-gray-600 text-gray-400 px-3 py-1 rounded cursor-not-allowed' :
                'bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded cyber-button';
                
            nextBtn.className = currentPage === pagesData.length - 1 ? 
                'bg-gray-600 text-gray-400 px-3 py-1 rounded cursor-not-allowed' :
                'bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded cyber-button';
        }
    };
    
    modal.innerHTML = `
        <div class="bg-[#0a0a23] rounded-2xl border border-[#1a2a4a] w-full max-w-4xl max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="p-4 border-b border-[#1a2a4a] flex justify-between items-center">
                <h3 class="text-xl font-bold text-cyan-400">
                    <i class="fas fa-file-alt mr-2"></i>Visualisation Dynamique - Résultats OCR
                </h3>
                <button onclick="this.closest('.fixed').remove()" 
                        class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Page Navigation -->
            <div class="p-4 border-b border-[#1a2a4a] bg-[#00111e]">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2">
                        <button id="prev-page-btn" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded cyber-button">
                            <i class="fas fa-chevron-left mr-1"></i>Précédent
                        </button>
                        <button id="next-page-btn" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded cyber-button">
                            Suivant<i class="fas fa-chevron-right ml-1"></i>
                        </button>
                    </div>
                    <div id="dynamic-page-info" class="text-[#a3b1d1]">
                        <!-- Page info will be inserted here -->
                    </div>
                </div>
            </div>
            
            <!-- Page Content -->
            <div class="flex-1 p-4 overflow-hidden">
                <div class="h-full bg-[#00111e] rounded-lg border border-[#1a2a4a] p-4 overflow-y-auto">
                    <pre id="dynamic-page-content" class="terminal-text text-[#a3b1d1] whitespace-pre-wrap text-sm leading-relaxed">
                        <!-- Page content will be inserted here -->
                    </pre>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="p-4 border-t border-[#1a2a4a] bg-[#00111e] flex justify-between items-center">
                <div class="flex space-x-2">
                    <button onclick="exportCurrentPage()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-download mr-1"></i>Exporter Page
                    </button>
                    <button onclick="exportAllPages()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-file-export mr-1"></i>Exporter Tout
                    </button>
                </div>
                <div class="text-[#a3b1d1] text-xs">
                    Utilisez ← → pour naviguer entre les pages
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up event listeners
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            updatePageContent();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentPage < pagesData.length - 1) {
            currentPage++;
            updatePageContent();
        }
    });
    
    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft' && currentPage > 0) {
            currentPage--;
            updatePageContent();
        } else if (e.key === 'ArrowRight' && currentPage < pagesData.length - 1) {
            currentPage++;
            updatePageContent();
        } else if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    });
    
    // Initialize first page
    updatePageContent();
    
    // Store pages data globally for export functions
    window.currentPagesData = pagesData;
    window.currentPageIndex = () => currentPage;
}

// Export current page
function exportCurrentPage() {
    const pagesData = window.currentPagesData;
    const currentPage = window.currentPageIndex();
    
    if (pagesData && pagesData[currentPage]) {
        const page = pagesData[currentPage];
        const content = `NetSecurePro IA - Export Page ${page.page_number}
Date d'export: ${new Date().toLocaleString()}
Auteur: Zoubirou Mohammed Ilyes
=====================================

${page.content}

=====================================
Page ${page.page_number} - ${page.char_count} caractères
Généré par NetSecurePro IA OCR System
`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `netsecurepro_page_${page.page_number}_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage(`Page ${page.page_number} exportée avec succès`, 'success');
    }
}

// Export all pages
function exportAllPages() {
    window.open('/export-text', '_blank');
    showMessage('Export complet initié', 'success');
}

// Generate QR Code for APK download
function generateQRCode() {
    fetch('/generate-qr')
    .then(response => response.json())
    .then(data => {
        if (data.qr_code) {
            // Create QR code modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-[#0a0a23] p-6 rounded-2xl border border-[#1a2a4a] max-w-md">
                    <h3 class="text-xl font-bold text-cyan-400 mb-4 text-center">
                        <i class="fas fa-mobile-alt mr-2"></i>Télécharger APK NetSecurePro
                    </h3>
                    <div class="text-center mb-4">
                        <img src="${data.qr_code}" alt="QR Code" class="mx-auto mb-2 border border-cyan-400 rounded">
                        <p class="text-[#a3b1d1] text-sm">Scannez ce QR code avec votre téléphone</p>
                    </div>
                    <div class="text-center">
                        <a href="${data.apk_url}" target="_blank" 
                           class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded cyber-button inline-block mr-2">
                            <i class="fas fa-download mr-1"></i>Télécharger APK
                        </a>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                            Fermer
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } else {
            showMessage('Erreur lors de la génération du QR Code', 'error');
        }
    })
    .catch(error => {
        showMessage(`Erreur QR Code: ${error.message}`, 'error');
    });
}

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
