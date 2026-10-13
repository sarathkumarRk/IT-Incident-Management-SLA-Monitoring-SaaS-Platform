import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine

# Import all models through models/__init__.py
from app import models

from app.routes import (
    auth,
    users,
    teams,
    incidents,
    sla,
    analytics,
    notifications,
)

Base.metadata.create_all(bind=engine)

from app.services.sla_scheduler import (
    start_sla_scheduler,
    stop_sla_scheduler,
)

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s", settings.APP_NAME)

    start_sla_scheduler()

    yield

    stop_sla_scheduler()

    logger.info("Stopped %s", settings.APP_NAME)


app = FastAPI(
    description=(
        "IT Incident Management and SLA Monitoring Platform "
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(incidents.router)
app.include_router(sla.router)
app.include_router(analytics.router)
app.include_router(notifications.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "IT Incident Management API is running",
        
    }

