import os
import io
import logging
import fitz  # PyMuPDF
import pytesseract
from flask import Flask, render_template, request, jsonify
from PIL import Image
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key")

@app.route('/')
def index():
    """Render the main interface."""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    """Process PDF file and extract text using OCR."""
    if 'pdf_file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    pdf_file = request.files['pdf_file']
    if pdf_file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not pdf_file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are supported"}), 400
    
    try:
        # Process PDF file
        pdf_stream = io.BytesIO(pdf_file.read())
        ocr_results = []
        
        with fitz.open(stream=pdf_stream, filetype="pdf") as doc:
            for i, page in enumerate(doc):
                # Get page as image
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                
                # Perform OCR
                text = pytesseract.image_to_string(img)
                ocr_results.append({
                    "page": i + 1,
                    "text": text
                })
        
        return jsonify({
            "success": True,
            "filename": secure_filename(pdf_file.filename),
            "pages": len(ocr_results),
            "results": ocr_results
        })
    
    except Exception as e:
        logging.error(f"Error processing PDF: {str(e)}")
        return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500

@app.route('/ask', methods=['POST'])
def ask_ai():
    """Simulate AI responses for the terminal."""
    data = request.get_json()
    
    if not data or 'question' not in data:
        return jsonify({"error": "No question provided"}), 400
    
    question = data['question'].lower().strip()
    
    # Basic response simulation
    if "hello" in question or "hi" in question:
        response = "Greetings, human. How may I assist you today?"
    elif "help" in question:
        response = "I can analyze PDF documents, extract text using OCR, and answer basic questions."
    elif "ocr" in question:
        response = "OCR (Optical Character Recognition) is a technology that converts different types of documents, such as scanned paper documents, PDF files, or images into editable and searchable data."
    elif "pdf" in question:
        response = "PDF (Portable Document Format) is a file format developed by Adobe to present documents in a manner independent of application software, hardware, and operating systems."
    elif "version" in question or "about" in question:
        response = "JANEWAY IA v1.0 - Advanced OCR Analysis Module. Created by Milyes."
    else:
        response = "I don't have specific information about that query. Please upload a PDF for analysis or ask about OCR functionality."
    
    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
