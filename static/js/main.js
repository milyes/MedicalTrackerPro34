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

// Open CLI Modal
function openCLIModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-[#0a0a23] rounded-2xl border border-[#1a2a4a] w-full max-w-2xl">
            <div class="p-4 border-b border-[#1a2a4a] flex justify-between items-center">
                <h3 class="text-xl font-bold text-cyan-400">
                    <i class="fas fa-terminal mr-2"></i>Interface CLI - NetSecurePro IA
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6">
                <div class="bg-[#00111e] rounded-lg p-4 mb-4 border border-[#1a2a4a]">
                    <h4 class="text-cyan-400 mb-2 font-semibold">Utilisation CLI</h4>
                    <pre class="terminal-text text-[#a3b1d1] text-sm">
# Mode interactif
python cli_ocr.py -i

# Traitement direct
python cli_ocr.py document.pdf -o resultat.txt

# Export JSON
python cli_ocr.py document.pdf -o data.json --json

# Spécifier la langue
python cli_ocr.py document.pdf -l fra+eng -o output.txt
                    </pre>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="copyToClipboard('python cli_ocr.py -i')" 
                            class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-copy mr-1"></i>Copier Mode Interactif
                    </button>
                    <a href="/static/cli_ocr.py" download class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm text-center">
                        <i class="fas fa-download mr-1"></i>Télécharger CLI
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show API Info
function showAPIInfo() {
    fetch('/api/info')
    .then(response => response.json())
    .then(data => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
        
        modal.innerHTML = `
            <div class="bg-[#0a0a23] rounded-2xl border border-[#1a2a4a] w-full max-w-2xl">
                <div class="p-4 border-b border-[#1a2a4a] flex justify-between items-center">
                    <h3 class="text-xl font-bold text-cyan-400">
                        <i class="fas fa-code mr-2"></i>API Information
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="bg-[#00111e] rounded-lg p-4 mb-4 border border-[#1a2a4a]">
                        <h4 class="text-cyan-400 mb-2 font-semibold">Endpoints Disponibles</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex items-center">
                                <span class="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2">POST</span>
                                <code class="text-[#a3b1d1]">/ask</code>
                                <span class="text-gray-400 ml-2">- Commandes terminal</span>
                            </div>
                            <div class="flex items-center">
                                <span class="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2">POST</span>
                                <code class="text-[#a3b1d1]">/process-pdf</code>
                                <span class="text-gray-400 ml-2">- Upload PDF</span>
                            </div>
                            <div class="flex items-center">
                                <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">GET</span>
                                <code class="text-[#a3b1d1]">/export-text</code>
                                <span class="text-gray-400 ml-2">- Export texte</span>
                            </div>
                            <div class="flex items-center">
                                <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">GET</span>
                                <code class="text-[#a3b1d1]">/generate-qr</code>
                                <span class="text-gray-400 ml-2">- QR Code APK</span>
                            </div>
                            <div class="flex items-center">
                                <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">GET</span>
                                <code class="text-[#a3b1d1]">/api/info</code>
                                <span class="text-gray-400 ml-2">- Info API</span>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="copyToClipboard('${window.location.origin}/api/info')" 
                                class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-copy mr-1"></i>Copier URL API
                        </button>
                        <button onclick="window.open('/api/info', '_blank')" 
                                class="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-external-link-alt mr-1"></i>Voir API
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    })
    .catch(error => {
        showMessage('Erreur lors du chargement des informations API', 'error');
    });
}

// Show Shortcuts
function showShortcuts() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-[#0a0a23] rounded-2xl border border-[#1a2a4a] w-full max-w-2xl">
            <div class="p-4 border-b border-[#1a2a4a] flex justify-between items-center">
                <h3 class="text-xl font-bold text-cyan-400">
                    <i class="fas fa-keyboard mr-2"></i>Raccourcis Clavier
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 gap-4">
                    <div class="bg-[#00111e] rounded-lg p-4 border border-[#1a2a4a]">
                        <h4 class="text-cyan-400 mb-3 font-semibold">Navigation Générale</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">Entrée</span>
                                <span class="text-gray-400">Envoyer commande terminal</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">Échap</span>
                                <span class="text-gray-400">Fermer modales</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-[#00111e] rounded-lg p-4 border border-[#1a2a4a]">
                        <h4 class="text-cyan-400 mb-3 font-semibold">Visualiseur de Pages</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">← →</span>
                                <span class="text-gray-400">Navigation entre pages</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">Échap</span>
                                <span class="text-gray-400">Fermer visualiseur</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-[#00111e] rounded-lg p-4 border border-[#1a2a4a]">
                        <h4 class="text-cyan-400 mb-3 font-semibold">Actions Rapides</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">Ctrl + U</span>
                                <span class="text-gray-400">Upload fichier</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-[#a3b1d1]">Ctrl + E</span>
                                <span class="text-gray-400">Export rapide</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show About
function showAbout() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-[#0a0a23] rounded-2xl border border-[#1a2a4a] w-full max-w-2xl">
            <div class="p-4 border-b border-[#1a2a4a] flex justify-between items-center">
                <h3 class="text-xl font-bold text-cyan-400">
                    <i class="fas fa-heart mr-2"></i>À propos de NetSecurePro IA
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6 text-center">
                <div class="mb-6">
                    <div class="text-6xl mb-4">🤖</div>
                    <h4 class="text-2xl font-bold text-cyan-400 mb-2">NetSecurePro IA</h4>
                    <p class="text-[#a3b1d1] mb-4">OCR Intelligent v1.0</p>
                </div>
                <div class="bg-[#00111e] rounded-lg p-4 mb-4 border border-[#1a2a4a] text-left">
                    <p class="text-[#a3b1d1] mb-2">
                        <strong class="text-cyan-400">Auteur:</strong> Zoubirou Mohammed Ilyes
                    </p>
                    <p class="text-[#a3b1d1] mb-2">
                        <strong class="text-cyan-400">ORCID:</strong> 
                        <a href="https://orcid.org/0009-0007-7571-3178" target="_blank" class="text-purple-400 hover:underline">
                            0009-0007-7571-3178
                        </a>
                    </p>
                    <p class="text-[#a3b1d1] mb-2">
                        <strong class="text-cyan-400">Version:</strong> 1.0
                    </p>
                    <p class="text-[#a3b1d1]">
                        <strong class="text-cyan-400">Technologies:</strong> Flask, PyMuPDF, Tesseract OCR, TailwindCSS
                    </p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <a href="https://orcid.org/0009-0007-7571-3178" target="_blank" 
                       class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-user mr-1"></i>Profil Auteur
                    </a>
                    <button onclick="generateQRCode()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-mobile-alt mr-1"></i>APK Mobile
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Export to JSON
function exportToJSON() {
    const pagesData = window.currentPagesData;
    if (pagesData) {
        const jsonData = {
            app_name: "NetSecurePro IA - OCR Intelligent",
            version: "1.0",
            author: "Zoubirou Mohammed Ilyes",
            export_date: new Date().toISOString(),
            pages: pagesData
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `netsecurepro_export_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('Export JSON créé avec succès', 'success');
    } else {
        showMessage('Aucune donnée à exporter', 'error');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showMessage('Copié dans le presse-papiers', 'success');
    }, function() {
        showMessage('Erreur de copie', 'error');
    });
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
            switch(e.key) {
                case 'u':
                    e.preventDefault();
                    document.getElementById('pdf-upload').click();
                    break;
                case 'e':
                    e.preventDefault();
                    sendMessage('export');
                    break;
            }
        }
    });
});

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
