# backend/app/routes.py
from fastapi import APIRouter, HTTPException, Depends
import logging

# Import payload/response models and the *service* function
from .schemas import MashupPayload, MashupResult
from .mashup_service import generate_mashup # Import the main service function
from .dependencies import get_supabase_client
from supabase import AsyncClient

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/process-tracks", response_model=MashupResult)
async def process_tracks_endpoint(payload: MashupPayload, supabase: AsyncClient = Depends(get_supabase_client)):
    """
    API endpoint to generate a mashup timeline and stem URLs.
    Delegates processing to the mashup service.
    """
    logger.info(f"Received API request for /process-tracks.")
    if not payload.tracks:
        # Basic validation can stay here
        raise HTTPException(status_code=400, detail="No tracks provided in the payload.")

    try:
        # --- Call the main service function ---
        result = await generate_mashup(payload, supabase)
        # --- Return the result ---
        return result

    except ValueError as ve: # Catch specific errors raised by the service
         logger.warning(f"Mashup generation failed (ValueError): {ve}")
         # Map specific ValueErrors to appropriate HTTP status codes if needed
         if "Missing stems for required anchor tracks" in str(ve):
              raise HTTPException(status_code=500, detail=str(ve)) # Internal error if required stems missing
         else:
              raise HTTPException(status_code=400, detail=str(ve)) # Assume bad request for other ValueErrors
    except FileNotFoundError as fnf: # Catch errors from audio processing layer if needed
        logger.error(f"File operation error during mashup generation: {fnf}", exc_info=True)
        raise HTTPException(status_code=500, detail="Audio processing component failed (file error).")
    except Exception as e: # Catch unexpected errors from the service layer
        logger.error(f"Unexpected error during mashup generation: {e}", exc_info=True)
        # Avoid leaking internal details unless necessary for debugging
        raise HTTPException(status_code=500, detail=f"Internal Server Error occurred during processing.")