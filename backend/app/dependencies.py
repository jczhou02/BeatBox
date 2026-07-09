from typing import Optional
from supabase import acreate_client, AsyncClient, ClientOptions
from httpx import AsyncClient as HttpxAsyncClient
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# --- Application-level Supabase Client Store ---
# We use a simple variable in this module to hold the single client instance.
# It will be initialized during the application lifespan startup.
_supabase_client: Optional[AsyncClient] = None

async def initialize_supabase_client():
    """Initializes the Supabase client. Called once on application startup."""
    global _supabase_client
    if _supabase_client is not None:
        logger.warning("Supabase client already initialized.")
        return

    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        logger.info("Initializing Supabase client...")
        try:
            _supabase_client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            logger.info("Supabase async client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase async client: {e}", exc_info=True)
            raise RuntimeError(f"Could not connect to Supabase on startup: {e}")
    else:
        logger.error("SupABASE_URL or SUPABASE_SERVICE_KEY environment variables not set.")
        # Critical error, app probably can't function without Supabase
        raise ValueError("Supabase configuration missing. Cannot initialize client.")

async def close_supabase_client():
    """Closes/cleans up the Supabase client. Called once on application shutdown."""
    global _supabase_client
    if _supabase_client:
        logger.info("Cleaning up Supabase client...")
        # supabase-py using httpx usually handles connection closing automatically.
        # Setting to None allows garbage collection and signals it's closed.
        await _supabase_client.postgrest.aclose()
        _supabase_client = None
        logger.info("Supabase client resources released.")

def get_supabase_client() -> AsyncClient:
    """
    FastAPI dependency function to get the initialized Supabase client.
    Relies on the client being initialized during application lifespan startup.
    """
    if _supabase_client is None:
        # This should ideally not happen if lifespan is set up correctly
        logger.error("Supabase client accessed before initialization or after shutdown!")
        raise RuntimeError("Supabase client is not available. Check application lifespan management.")
    return _supabase_client