import os
import io
import logging
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
from flask import Flask, render_template, request, jsonify, flash, session, send_file, Response
import json
from datetime import datetime
import tempfile
import base64

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure OCR session storage
class OCRSessionManager:
    def store_result(self, ocr_text, pages_data=None):
        session['ocr_results'] = ocr_text
        if pages_data:
            session['pages_data'] = pages_data
        
    def get_results(self):
        return session.get('ocr_results', '')
    
    def get_pages_data(self):
        return session.get('pages_data', [])
    
    def clear_results(self):
        if 'ocr_results' in session:
            del session['ocr_results']
        if 'pages_data' in session:
            del session['pages_data']

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
                'response': "NetSecurePro IA - Commandes disponibles:\n- analyze: Analyser le document\n- clear: Effacer les résultats\n- status: État du système\n- show results: Afficher les résultats\n- export: Exporter vers fichier texte\n- download: Télécharger le dernier export\n- qr: Générer QR Code APK\n- version: Informations du système"
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
                pages_data = ocr_manager.get_pages_data()
                if pages_data:
                    return jsonify({
                        'response': f"Document analysé - {len(pages_data)} pages trouvées. Navigation dynamique activée.",
                        'show_pages': True,
                        'pages_data': pages_data
                    })
                else:
                    return jsonify({
                        'response': f"Résultats OCR:\n{ocr_results[:500]}...\n(Résultats tronqués pour l'affichage)"
                    })
            else:
                return jsonify({
                    'response': "Aucun résultat disponible. Analysez d'abord un document."
                })
        elif 'export' in question:
            if ocr_results:
                # Export functionality
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"ocr_export_{timestamp}.txt"
                return jsonify({
                    'response': f"Export créé: {filename}. Utilisez 'download {filename}' pour télécharger.",
                    'export_ready': True,
                    'filename': filename
                })
            else:
                return jsonify({
                    'response': "Aucun résultat à exporter. Analysez d'abord un document."
                })
        elif 'download' in question:
            return jsonify({
                'response': "Téléchargement initié... Vérifiez votre dossier de téléchargements.",
                'download_action': True
            })
        elif 'qr' in question or 'apk' in question:
            return jsonify({
                'response': "Génération du QR Code pour télécharger l'APK NetSecurePro...",
                'qr_action': True
            })
        elif 'version' in question or 'info' in question:
            return jsonify({
                'response': "NetSecurePro IA - OCR Intelligent v1.0\nAuteur: Zoubirou Mohammed Ilyes\nMoteur: PyMuPDF + Tesseract OCR"
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
        ocr_output, pages_data = process_pdf_with_ocr(pdf_bytes)
        
        # Store results in session
        ocr_manager.store_result(ocr_output, pages_data)
        
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
    pages_data = []
    
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
                page_content = f"--- Page {i+1}/{total_pages} ---\n{text}\n\n"
                ocr_output += page_content
                
                # Store page data for dynamic display
                pages_data.append({
                    'page_number': i + 1,
                    'content': text.strip(),
                    'char_count': len(text.strip()),
                    'has_content': len(text.strip()) > 0,
                    'preview': text.strip()[:100] + "..." if len(text.strip()) > 100 else text.strip()
                })
                
    except Exception as e:
        logging.error(f"OCR processing error: {str(e)}")
        raise
        
    return ocr_output, pages_data

@app.route('/export-text')
def export_text():
    """Export OCR results as downloadable text file"""
    try:
        ocr_results = ocr_manager.get_results()
        if not ocr_results:
            return jsonify({'error': 'Aucun résultat à exporter'}), 400
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"netsecurepro_ocr_export_{timestamp}.txt"
        
        # Create file content with metadata
        content = f"""NetSecurePro IA - Export OCR
Date d'export: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Auteur: Zoubirou Mohammed Ilyes
Version: 1.0
=====================================

{ocr_results}

=====================================
Généré par NetSecurePro IA OCR System
"""
        
        return Response(
            content,
            mimetype='text/plain',
            headers={"Content-disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logging.error(f"Export error: {str(e)}")
        return jsonify({'error': f'Erreur lors de l\'export: {str(e)}'}), 500

@app.route('/generate-qr')
def generate_qr():
    """Generate QR code for APK download"""
    try:
        import qrcode
        
        # APK download URL
        apk_url = "https://netsecurepro.github.io/NetSecureOCR.apk"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(apk_url)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'qr_code': f"data:image/png;base64,{img_str}",
            'apk_url': apk_url
        })
        
    except ImportError:
        return jsonify({'error': 'Module QR Code non disponible'}), 500
    except Exception as e:
        logging.error(f"QR generation error: {str(e)}")
        return jsonify({'error': f'Erreur lors de la génération: {str(e)}'}), 500

@app.route('/api/info')
def api_info():
    """API endpoint for mobile app integration"""
    return jsonify({
        'app_name': 'NetSecurePro IA - OCR Intelligent',
        'version': '1.0',
        'author': 'Zoubirou Mohammed Ilyes',
        'orcid': 'https://orcid.org/0009-0007-7571-3178',
        'features': [
            'OCR PDF précis (PyMuPDF)',
            'Export texte OCR', 
            'Interface Web style terminal futuriste',
            'Version APK mobile WebView offline',
            'QR Code de téléchargement intégré'
        ],
        'apk_url': 'https://netsecurepro.github.io/NetSecureOCR.apk'
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
