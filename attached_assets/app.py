import streamlit as st
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

st.set_page_config(page_title="TOCH OCR PDF – IA", layout="centered")
st.title("TOCH OCR PDF – IA")

st.markdown("**Déposez un fichier PDF ci-dessous pour lancer l'analyse OCR.**")
pdf_file = st.file_uploader("Fichier PDF", type=["pdf"])

if pdf_file:
    st.info("Analyse du fichier en cours...")
    with fitz.open(stream=pdf_file.read(), filetype="pdf") as doc:
        ocr_output = ""
        for i, page in enumerate(doc):
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img)
            ocr_output += f"--- Page {i+1} ---\n{text}\n\n"
        st.success("Analyse terminée !")
        st.text_area("Résultat OCR", ocr_output, height=400)
