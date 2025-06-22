#!/usr/bin/env python3
"""
NetSecurePro IA - OCR CLI Tool
Command Line Interface for OCR processing
Author: Zoubirou Mohammed Ilyes
Version: 1.0
"""

import argparse
import sys
import os
import io
import logging
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
from datetime import datetime
import json

class NetSecureOCR:
    def __init__(self):
        self.version = "1.0"
        self.author = "Zoubirou Mohammed Ilyes"
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def print_banner(self):
        """Print application banner"""
        banner = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           NetSecurePro IA OCR                               ║
║                         OCR Intelligent v{self.version}                                ║
║                                                                              ║
║  Auteur: {self.author}                                   ║
║  ORCID: https://orcid.org/0009-0007-7571-3178                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
        print(banner)
    
    def process_pdf(self, pdf_path, output_file=None, lang='fra+eng', json_output=False):
        """Process PDF file with OCR"""
        try:
            self.logger.info(f"Traitement du fichier: {pdf_path}")
            
            if not os.path.exists(pdf_path):
                raise FileNotFoundError(f"Fichier introuvable: {pdf_path}")
            
            ocr_output = ""
            metadata = {
                'file': pdf_path,
                'timestamp': datetime.now().isoformat(),
                'author': self.author,
                'version': self.version,
                'language': lang,
                'pages': []
            }
            
            with fitz.open(pdf_path) as doc:
                total_pages = len(doc)
                self.logger.info(f"Nombre de pages: {total_pages}")
                
                for i, page in enumerate(doc):
                    self.logger.info(f"Traitement page {i+1}/{total_pages}")
                    
                    # Get page as pixmap (image)
                    pix = page.get_pixmap()
                    img_bytes = pix.tobytes("png")
                    
                    # Open with PIL for OCR processing
                    img = Image.open(io.BytesIO(img_bytes))
                    
                    # Perform OCR on the image
                    text = pytesseract.image_to_string(img, lang=lang)
                    
                    # Add to output
                    page_text = f"--- Page {i+1}/{total_pages} ---\n{text}\n\n"
                    ocr_output += page_text
                    
                    # Add to metadata
                    metadata['pages'].append({
                        'page_number': i+1,
                        'text_length': len(text),
                        'has_text': len(text.strip()) > 0
                    })
            
            # Save output
            if output_file:
                if json_output:
                    result = {
                        'metadata': metadata,
                        'content': ocr_output
                    }
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, indent=2, ensure_ascii=False)
                    self.logger.info(f"Résultats sauvés (JSON): {output_file}")
                else:
                    content = f"""NetSecurePro IA - Export OCR
Date d'export: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Fichier source: {pdf_path}
Auteur: {self.author}
Version: {self.version}
Langue OCR: {lang}
=====================================

{ocr_output}

=====================================
Généré par NetSecurePro IA OCR System
Statistiques:
- Pages traitées: {total_pages}
- Caractères extraits: {len(ocr_output)}
"""
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    self.logger.info(f"Résultats sauvés: {output_file}")
            else:
                # Print to stdout
                print("\n" + "="*80)
                print("RÉSULTATS OCR")
                print("="*80)
                print(ocr_output)
                print("="*80)
                print(f"Pages traitées: {total_pages}")
                print(f"Caractères extraits: {len(ocr_output)}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors du traitement: {str(e)}")
            return False
    
    def interactive_mode(self):
        """Interactive terminal mode"""
        self.print_banner()
        print("Mode interactif - Tapez 'help' pour l'aide ou 'quit' pour quitter\n")
        
        while True:
            try:
                command = input("NetSecurePro> ").strip().lower()
                
                if command in ['quit', 'exit', 'q']:
                    print("Au revoir!")
                    break
                elif command == 'help':
                    self.show_help()
                elif command == 'version':
                    print(f"NetSecurePro IA OCR v{self.version}")
                    print(f"Auteur: {self.author}")
                elif command == 'info':
                    self.show_info()
                elif command.startswith('process '):
                    pdf_path = command[8:].strip()
                    self.process_pdf(pdf_path)
                else:
                    print(f"Commande inconnue: {command}")
                    print("Tapez 'help' pour voir les commandes disponibles")
                    
            except KeyboardInterrupt:
                print("\nInterruption détectée. Au revoir!")
                break
            except EOFError:
                print("\nFin de session. Au revoir!")
                break
    
    def show_help(self):
        """Show help information"""
        help_text = """
Commandes disponibles:

  process <fichier.pdf>    - Traiter un fichier PDF
  version                  - Afficher la version
  info                     - Informations détaillées
  help                     - Afficher cette aide
  quit/exit/q             - Quitter

Exemples:
  process document.pdf
  process /chemin/vers/fichier.pdf
"""
        print(help_text)
    
    def show_info(self):
        """Show detailed information"""
        info_text = f"""
NetSecurePro IA - OCR Intelligent
================================

Version: {self.version}
Auteur: {self.author}
ORCID: https://orcid.org/0009-0007-7571-3178

Fonctionnalités:
- OCR PDF précis (PyMuPDF + Tesseract)
- Support français et anglais
- Export texte avec métadonnées
- Interface CLI et Web
- Version mobile Flutter APK

Technologies:
- PyMuPDF: Extraction d'images PDF
- Tesseract OCR: Reconnaissance de texte
- Flask: Interface web
- Python: Backend

APK Mobile: https://netsecurepro.github.io/NetSecureOCR.apk
"""
        print(info_text)

def main():
    parser = argparse.ArgumentParser(
        description='NetSecurePro IA - OCR Intelligent CLI',
        epilog='Exemple: python cli_ocr.py document.pdf -o resultat.txt'
    )
    
    parser.add_argument('input', nargs='?', help='Fichier PDF à traiter')
    parser.add_argument('-o', '--output', help='Fichier de sortie')
    parser.add_argument('-l', '--lang', default='fra+eng', 
                       help='Langues OCR (défaut: fra+eng)')
    parser.add_argument('-j', '--json', action='store_true',
                       help='Sortie au format JSON')
    parser.add_argument('-i', '--interactive', action='store_true',
                       help='Mode interactif')
    parser.add_argument('-v', '--version', action='version',
                       version='NetSecurePro IA OCR v1.0')
    
    args = parser.parse_args()
    
    ocr = NetSecureOCR()
    
    if args.interactive or not args.input:
        ocr.interactive_mode()
    else:
        ocr.print_banner()
        success = ocr.process_pdf(args.input, args.output, args.lang, args.json)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()