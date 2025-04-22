import os
import io
import logging
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
from flask import Flask, render_template, request, jsonify, flash, session

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure OCR session storage
class OCRSessionManager:
    def store_result(self, ocr_text):
        session['ocr_results'] = ocr_text
        
    def get_results(self):
        return session.get('ocr_results', '')
    
    def clear_results(self):
        if 'ocr_results' in session:
            del session['ocr_results']

# Initialize OCR session manager
ocr_manager = OCRSessionManager()

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    """Process a question from the terminal interface"""
    try:
        data = request.json
        question = data.get('question', '').lower()
        
        # Get OCR results
        ocr_results = ocr_manager.get_results()
        
        # Basic terminal commands simulation
        if 'help' in question:
            return jsonify({
                'response': "Commandes disponibles:\n- analyze: Analyser le document\n- clear: Effacer les résultats\n- status: État du système"
            })
        elif 'status' in question:
            if ocr_results:
                return jsonify({
                    'response': "État: Document analysé. Utilisez 'show results' pour afficher le texte extrait."
                })
            else:
                return jsonify({
                    'response': "État: Aucun document analysé. Importez un PDF pour commencer."
                })
        elif 'clear' in question:
            ocr_manager.clear_results()
            return jsonify({
                'response': "Mémoire effacée. Tous les résultats ont été supprimés."
            })
        elif 'show results' in question or 'afficher' in question:
            if ocr_results:
                return jsonify({
                    'response': f"Résultats OCR:\n{ocr_results[:500]}...\n(Résultats tronqués pour l'affichage)"
                })
            else:
                return jsonify({
                    'response': "Aucun résultat disponible. Analysez d'abord un document."
                })
        else:
            return jsonify({
                'response': f"Commande '{question}' non reconnue. Tapez 'help' pour voir les commandes disponibles."
            })
    except Exception as e:
        logging.error(f"Error processing question: {str(e)}")
        return jsonify({
            'response': f"Erreur système: {str(e)}"
        }), 500

@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    """Process uploaded PDF file with OCR"""
    try:
        if 'pdf_file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'Aucun fichier sélectionné'
            }), 400
            
        pdf_file = request.files['pdf_file']
        
        if pdf_file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'Aucun fichier sélectionné'
            }), 400
            
        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({
                'status': 'error',
                'message': 'Le fichier doit être au format PDF'
            }), 400
            
        # Process the PDF with PyMuPDF
        pdf_bytes = pdf_file.read()
        ocr_output = process_pdf_with_ocr(pdf_bytes)
        
        # Store results in session
        ocr_manager.store_result(ocr_output)
        
        # Return success with a preview
        return jsonify({
            'status': 'success',
            'message': 'Analyse OCR terminée avec succès',
            'preview': ocr_output[:200] + "..." if len(ocr_output) > 200 else ocr_output
        })
        
    except Exception as e:
        logging.error(f"PDF processing error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Erreur lors du traitement: {str(e)}'
        }), 500

def process_pdf_with_ocr(pdf_bytes):
    """Process a PDF file with OCR"""
    ocr_output = ""
    
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            total_pages = len(doc)
            
            for i, page in enumerate(doc):
                # Get page as pixmap (image)
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                
                # Open with PIL for OCR processing
                img = Image.open(io.BytesIO(img_bytes))
                
                # Perform OCR on the image
                text = pytesseract.image_to_string(img, lang='fra+eng')
                
                # Add to output
                ocr_output += f"--- Page {i+1}/{total_pages} ---\n{text}\n\n"
                
    except Exception as e:
        logging.error(f"OCR processing error: {str(e)}")
        raise
        
    return ocr_output

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
