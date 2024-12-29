
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, conv
from .database import Base, engine

app = FastAPI()

Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])

app.include_router(auth.router)
app.include_router(conv.router)
