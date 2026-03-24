import argparse
import os
import shutil
import logging
from pathlib import Path
from langchain.document_loaders import PDFPlumberLoader
from langchain.schema import Document
from get_embedding_function import get_embedding_function
from langchain_community.vectorstores import Chroma  # updated import
from tqdm import tqdm

# Configuration des logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

CHROMA_PATH = "chroma"
DATA_PATH = "data"

prompt_template = """
You are a market prospection specialist with expertise in aeronautical company certifications.
The document you are using is structured as a table with the following columns:
- Organisation Name (e.g., "AAR Aircraft Services, Inc.")
- Country (e.g., "United States")
- Approval Reference (e.g., "EASA.145.1234")
- Address (e.g., "123 Aviation Blvd, Miami, FL")
- Scope of Approval (e.g., "Base Maintenance, Line Maintenance")
- Certificate Issue Date (e.g., "2024-01-15")
- Certificate Expiry Date (e.g., "2025-01-15")

When answering, always extract and present information using these columns. 
If a user asks about a company, provide the Organisation Name, Approval Reference, Scope, and all relevant dates and details from the table.
If the answer is not in the context, say you don't know.

Context:
{context}

Question:
{question}
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the database.")
    args = parser.parse_args()
    
    if args.reset:
        logging.info("✨ Clearing Database")
        clear_database()

    documents = load_documents()
    if not documents:
        logging.warning("No documents loaded. Check your data folder.")
        return
    
    chunks = split_documents(documents)
    add_to_chroma(chunks)


def load_documents():
    pdf_files = list(Path(DATA_PATH).glob("*.pdf"))
    if not pdf_files:
        logging.warning(f"No PDF files found in {DATA_PATH}")
        return []
    
    documents = []
    for pdf_file in pdf_files:
        logging.info(f"Loading: {pdf_file}")
        loader = PDFPlumberLoader(str(pdf_file))
        # Use loader.load() to get one Document per page (PDFPlumberLoader does this by default)
        documents.extend(loader.load())
    
    logging.info(f"Total documents loaded: {len(documents)}")
    return documents


def split_documents(documents: list[Document]):
    # Do not further split, keep each page as a chunk to preserve table structure
    logging.info(f"Total chunks created (by page): {len(documents)}")
    return documents


def add_to_chroma(chunks: list[Document]):
    db = Chroma(
        persist_directory=CHROMA_PATH, embedding_function=get_embedding_function()
    )
    chunks_with_ids = calculate_chunk_ids(chunks)
    
    existing_items = db.get(include=[])
    existing_ids = set(existing_items["ids"])
    logging.info(f"Existing documents in DB: {len(existing_ids)}")
    
    new_chunks = [chunk for chunk in chunks_with_ids if chunk.metadata["id"] not in existing_ids]
    if new_chunks:
        logging.info(f"Adding {len(new_chunks)} new documents to DB")
        db.add_documents(new_chunks, ids=[chunk.metadata["id"] for chunk in new_chunks])
        db.persist()
    else:
        logging.info("✅ No new documents to add")


def calculate_chunk_ids(chunks):
    last_page_id = None
    current_chunk_index = 0

    for chunk in chunks:
        source = chunk.metadata.get("source")
        page = chunk.metadata.get("page")
        current_page_id = f"{source}:{page}"

        if current_page_id == last_page_id:
            current_chunk_index += 1
        else:
            current_chunk_index = 0

        chunk.metadata["id"] = f"{current_page_id}:{current_chunk_index}"
        last_page_id = current_page_id

    return chunks


def clear_database():
    if os.path.exists(CHROMA_PATH):
        shutil.rmtree(CHROMA_PATH)
        logging.info("Database cleared.")


if __name__ == "__main__":
    main()
