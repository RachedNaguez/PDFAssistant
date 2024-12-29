import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, UploadFile, HTTPException
from pydantic import BaseModel
import torch
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.llms import LlamaCpp
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import Document

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('qa_system.log')
    ]
)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/conv",
    tags=["conv"]
)

@dataclass
class QAConfig:
    """Configuration class for QA system parameters."""
    base_path: Path = Path(__file__).parent.parent.parent.parent
    model_path: str = str(base_path / "mistral-7b-openorca.Q4_0.gguf")
    chunk_size: int = 1000
    chunk_overlap: int = 200
    temperature: float = 0.75
    top_p: float = 1
    context_window: int = 4096
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    device: str = "mps" if torch.backends.mps.is_available() else "cpu"

class LLMManager:
    """Manages LLM initialization and access."""
    _instance = None
    _llm = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize_llm(self, config: QAConfig):
        """Initialize the LLM with the given configuration."""
        if self._llm is None:
            logger.info("Initializing LLM")
            self._llm = LlamaCpp(
                streaming=True,
                model_path=config.model_path,
                temperature=config.temperature,
                top_p=config.top_p,
                f16_kv=True,
                verbose=False,
                n_ctx=config.context_window,
                n_gpu_layers=1,
                n_batch=512
            )
        return self._llm

    @property
    def llm(self):
        if self._llm is None:
            raise RuntimeError("LLM not initialized")
        return self._llm

class DocumentProcessor:
    """Handles document loading and chunking."""
    def __init__(self, config: QAConfig):
        self.config = config
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap
        )

    async def load_and_split(self, file: UploadFile) -> list[Document]:
        """Load PDF and split into chunks."""
        try:
            # Create a temporary file to save the uploaded PDF
            temp_path = Path("temp.pdf")
            content = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content)

            logger.info(f"Loading PDF from uploaded file: {file.filename}")
            loader = PyPDFLoader(str(temp_path))
            documents = loader.load()

            # Clean up temporary file
            temp_path.unlink()

            logger.info("Splitting documents into chunks")
            return self.text_splitter.split_documents(documents)
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise

class QASystem:
    """Main QA system implementation."""
    def __init__(self, config: QAConfig):
        self.config = config
        self.chain: Optional[ConversationalRetrievalChain] = None
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

    def initialize(self, text_chunks: list[Document]) -> None:
        """Initialize the QA system with processed documents."""
        try:
            # Get the pre-initialized LLM
            llm = LLMManager.get_instance().llm

            logger.info("Initializing embeddings")
            embeddings = HuggingFaceEmbeddings(
                model_name=self.config.embedding_model,
                model_kwargs={"device": self.config.device}
            )

            logger.info("Creating vector store")
            vector_store = Chroma.from_documents(text_chunks, embeddings)

            self.chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=vector_store.as_retriever(),
                memory=self.memory
            )
        except Exception as e:
            logger.error(f"Error initializing QA system: {e}")
            raise

    def get_answer(self, question: str) -> str:
        """Get answer for a given question."""
        try:
            if not self.chain:
                raise RuntimeError("QA system not initialized")

            response = self.chain.invoke({"question": question})
            return response.get("answer", "").strip()
        except Exception as e:
            logger.error(f"Error getting answer: {e}")
            raise

# Request/Response Models
class QuestionRequest(BaseModel):
    question: str

class Answer(BaseModel):
    answer: str

# Global instances
qa_system: Optional[QASystem] = None
config = QAConfig()

# Initialize LLM at startup
try:
    LLMManager.get_instance().initialize_llm(config)
    logger.info("LLM initialized successfully at startup")
except Exception as e:
    logger.error(f"Failed to initialize LLM at startup: {e}")
    raise

@router.post("/upload")
async def upload_pdfs(files: List[UploadFile]):
    """Upload and process multiple PDF files."""
    # Validate that all files are PDFs
    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format for {file.filename}. Only PDF files are allowed."
            )
    
    try:
        processor = DocumentProcessor(config)
        all_text_chunks = []

        # Process each uploaded PDF file
        for file in files:
            text_chunks = await processor.load_and_split(file)
            all_text_chunks.extend(text_chunks)
        
        global qa_system
        qa_system = QASystem(config)
        qa_system.initialize(all_text_chunks)

        return {"message": f"{len(files)} PDF file(s) processed successfully"}
    except Exception as e:
        logger.error(f"Error in upload_pdfs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask", response_model=Answer)
async def ask_question(request: QuestionRequest):
    """Ask a question about the uploaded documents."""
    if not qa_system:
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF first"
        )
    
    try:
        answer = qa_system.get_answer(request.question)
        return Answer(answer=answer)
    except Exception as e:
        logger.error(f"Error in ask_question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear")
async def clear_history():
    """Clear the conversation history."""
    if qa_system:
        qa_system.memory.clear()
    return {"message": "Chat history cleared"}