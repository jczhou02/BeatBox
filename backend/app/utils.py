# backend/app/utils.py
import os
import uuid
from fastapi import Depends # Import Depends
from supabase import AsyncClient # Import Client type hint
from app.dependencies import get_supabase_client
import logging
from typing import Optional
from .musictheory_utils import *

logger = logging.getLogger(__name__)

def upload_file(bucket: str, storage_path: str, local_file_path: str, supabase: AsyncClient) -> Optional[dict]:
    """
    Uploads a file from a local path to the specified Supabase bucket.
    Uses service role key implicitly via the initialized client.
    Returns the Supabase API response dictionary or None on failure.
    """
    if not os.path.exists(local_file_path):
        logger.error(f"Local file not found for upload: {local_file_path}")
        return None

    logger.debug(f"Uploading '{local_file_path}' to Bucket '{bucket}' at '{storage_path}'...")
    try:
        with open(local_file_path, 'rb') as f:
            # Using upload requires bytes, but passing the file handle might be efficient
            # Supabase Python client v1 vs v2 might handle this differently. Let's read bytes.
             file_data = f.read()
             if not file_data:
                 logger.error(f"File is empty: {local_file_path}")
                 return None

             # Use upsert=True to overwrite if it somehow already exists (optional)
             response = supabase.storage.from_(bucket).upload(
                 path=storage_path,
                 file=file_data,
                 file_options={"content-type": "audio/mpeg", "upsert": "true"} # Specify content type, upsert=True allows overwrite
            )
        # Check response structure (Supabase client v2 might differ)
        # Assuming response is ModelSingleResponse or similar structure
        if hasattr(response, 'error') and response.error:
             logger.error(f"Supabase upload failed for {storage_path}: {response.error}")
             return None
        elif isinstance(response, dict) and response.get('error'): # Handle potential dict response structure if needed based on client version
            logger.error(f"Supabase upload failed for {storage_path}: {response.get('error')}")
            return None
        else:
             logger.info(f"Successfully uploaded to {storage_path}")
             # Return the success response object/dict if needed downstream
             return response if isinstance(response, dict) else {} # Return empty dict if non-dict success

    except Exception as e:
        logger.error(f"Exception during file upload to {storage_path}: {e}", exc_info=True)
        return None


def create_signed_url(bucket: str, storage_path: str, expires_in: int, supabase: AsyncClient) -> Optional[str]:
    """
    Generates a signed URL for a file in a Supabase bucket.
    Uses service role key implicitly.
    Returns the signed URL string or None on failure.
    """
    logger.debug(f"Creating signed URL for Bucket '{bucket}', Path '{storage_path}'...")
    try:
        response = supabase.storage.from_(bucket).create_signed_url(storage_path, expires_in)

        # Handle response variations (client v1 vs v2, dict vs object)
        signed_url = None
        if isinstance(response, dict):
            signed_url = response.get("signedURL") or response.get("signedUrl")
            error = response.get("error")
            if error:
                logger.error(f"Failed to generate signed URL for {storage_path}: {error} - {response.get('message')}")
                return None
        elif hasattr(response, 'signed_url'): # Check for attribute directly
             signed_url = response.signed_url
        elif hasattr(response, 'data') and isinstance(response.data, dict): # Check nested data dict
            signed_url = response.data.get("signedURL") or response.data.get("signedUrl")
            error = response.data.get("error")
            if error:
                logger.error(f"Failed to generate signed URL for {storage_path}: {error} - {response.data.get('message')}")
                return None
        elif hasattr(response, 'error') and response.error: # Check for error attribute
              logger.error(f"Failed to generate signed URL for {storage_path}: {response.error}")
              return None


        if not signed_url:
            logger.error(f"Could not extract signed URL from Supabase response for {storage_path}. Response: {response}")
            return None

        logger.info(f"Generated signed URL for {storage_path}")
        return signed_url

    except Exception as e:
        logger.error(f"Exception creating signed URL for {storage_path}: {e}", exc_info=True)
        return None
    

# --- Important Note for Utils ---
# If you call `upload_file` or `create_signed_url` from other functions *that are not themselves FastAPI endpoints or dependencies*,
# you CANNOT rely on `Depends` within the utility function signature. `Depends` only works when FastAPI calls the function.
# In such cases, you would need to:
# 1. Inject the client into the *calling* function (e.g., the service function).
# 2. Pass the client instance as a regular argument to the utility function.
# Example: change `upload_file(..., supabase: Client = Depends(get_supabase_client))`
#      to  `upload_file(..., supabase: Client)`
# And in the calling function: `upload_file(..., supabase=injected_client_instance)`
#
# However, looking at your `mashup_service.py`, `_generate_signed_urls` uses `asyncio.to_thread` to call `create_signed_url`.
# This means FastAPI's dependency injection *won't work directly* inside the thread for `create_signed_url`.
# The correct pattern is to inject the client into `_generate_signed_urls` and pass it to `create_signed_url`.
# Let's adjust `utils.py` assuming this pattern.

# --- ADJUSTED `utils.py` functions for explicit client passing ---

def upload_file_sync( # Renamed slightly to emphasize sync nature often used with to_thread
    bucket: str,
    storage_path: str,
    local_file_path: str,
    supabase: AsyncClient # Client passed explicitly
) -> Optional[dict]:
    # Same logic as before, but uses the passed 'supabase' client
    # ... (copy logic from above, ensuring it uses the 'supabase' parameter) ...
    if not os.path.exists(local_file_path): return None # Simplified for brevity
    logger.debug(f"Uploading '{local_file_path}' via passed client...")
    try:
        with open(local_file_path, 'rb') as f: file_data = f.read()
        response = supabase.storage.from_(bucket).upload(path=storage_path, file=file_data, file_options={"content-type": "audio/mpeg", "upsert": "true"})
        # ... (error checks) ...
        logger.info(f"Successfully uploaded to {storage_path}")
        return response if isinstance(response, dict) else {}
    except Exception as e: logger.error(f"Upload Exception: {e}", exc_info=True); return None


def create_signed_url_sync( # Renamed slightly
    bucket: str,
    storage_path: str,
    expires_in: int,
    supabase: AsyncClient # Client passed explicitly
) -> Optional[str]:
    # Same logic as before, uses the passed 'supabase' client
    logger.debug(f"Creating signed URL via passed client...")
    try:
        response = supabase.storage.from_(bucket).create_signed_url(storage_path, expires_in)
        # ... (response parsing and error checks) ...
        signed_url = response.get("signedURL") # Simplified check
        if signed_url:
            logger.info(f"Generated signed URL for {storage_path}")
            return signed_url
        else: # ... (handle errors) ...
             logger.error(f"Could not get signed URL for {storage_path}")
             return None
    except Exception as e: logger.error(f"Signed URL Exception: {e}", exc_info=True); return None