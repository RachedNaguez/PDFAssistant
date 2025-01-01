# PDF Assistant

This project demonstrates how to utilize a Large Language Model (LLM) to process and understand PDF documents for question-answering tasks.

The implementation leverages several powerful libraries to achieve this:

- **Torch**: For leveraging GPU acceleration in machine learning tasks.
- **Langchain**: A suite of tools for loading documents, splitting text, generating embeddings, and more.
- **HuggingFace Embeddings**: For creating semantic representations of text.
- **Chroma**: For building a vector store that enables efficient similarity-based retrieval.
- **LlamaCpp**: An LLM used for generating answers based on the processed text.
- **FastAPI**: For building the backend server.
- **Next.js**: For creating the frontend interface.

## Key Features

- **Device Adaptation**: Automatically uses CUDA-enabled GPU if available; otherwise, falls back to CPU, including support for Apple GPUs.
- **Document Loading**: Loads and processes PDF documents to prepare for analysis.
- **Text Splitting**: Efficiently splits large texts into manageable chunks.
- **Embeddings and Vector Store**: Utilizes HuggingFace embeddings and Chroma vector store for efficient information retrieval.
- **Conversational Interface**: Engages users in a Q&A session using the LLM with context-aware responses.

## How It Works

1. **Load the Document**: The PDF document is loaded, and its content is extracted.
2. **Split the Text**: The document is split into chunks to manage large texts effectively.
3. **Initialize the Model**: An LLM is configured to generate responses based on the processed text.
4. **Create Vector Store**: Text chunks are embedded and stored for quick retrieval.
5. **Run the Interaction Loop**: Users can ask questions, and the system provides accurate answers based on the document content.

## Installation

To run this project, ensure you have both the frontend and backend set up. Follow these steps:

### Backend Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/RachedNaguez/PDFAssistant.git
   ```
2. Navigate to the backend folder:
   ```bash
   cd PDFAssistant/backend
   ```
3. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use venv\Scripts\activate
   ```
4. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Navigate to the api folder:
   ```bash
   cd /api
   ```
6. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Installation
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```

## Usage

1. Start both the backend and frontend servers using the steps above.
2. Access the application in your web browser at `http://localhost:3000`.
3. Upload a PDF document and start asking questions about its content.

This project demonstrates the integration of powerful technologies for seamless PDF analysis and interaction. If you have questions or need assistance, please feel free to contact rachednaguez9@gmail.com.

