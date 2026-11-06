from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models.schemas import SessionState
from backend.services.model_router_service import ModelRouterService

app = FastAPI(title="Translational Medicine Agent Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_state = SessionState()

model_router = ModelRouterService()
app.state.model_router = model_router

from backend.routers import state, analyze, scenarios, docs, chat, knowledge, cicd, harmony, models

app.include_router(state.router)
app.include_router(analyze.router)
app.include_router(scenarios.router)
app.include_router(docs.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(cicd.router)
app.include_router(harmony.router)
app.include_router(models.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
