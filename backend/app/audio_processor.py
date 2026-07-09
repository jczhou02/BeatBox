# backend/app/audio_processor.py
import os
import tempfile
import asyncio
import subprocess
import uuid
import httpx
import zipfile
import io
import modal
from .utils import upload_file_sync 
from yt_dlp import YoutubeDL
from typing import Dict, Optional
import logging
from fastapi import Depends
from app.dependencies import get_supabase_client
from app.config import get_settings
from supabase import AsyncClient

# --- Setup ---
logger = logging.getLogger(__name__)
settings = get_settings()
BUCKET_NAME = settings.SUPABASE_BUCKET

# --- Stem Processing Functions ---

def get_stem_storage_path(source_track_id: str, stem_type: str) -> str:
    """Generates the standardized storage path for a stem."""
    # Use source_track_id (UUID) for the main folder
    return f"stems/{source_track_id}/{stem_type}.mp3" # Assuming mp3 output

async def check_and_retrieve_existing_stems(source_track_id: str, supabase: AsyncClient) -> Dict[str, str]:
    """
    Queries Supabase 'stems' table for existing stems for a given source_track_id.
    Returns a dictionary mapping stem_type -> storage_path if found.
    """
    logger.debug(f"Checking existing stems for source_track_id: {source_track_id}")
    try:
        response = await (
            supabase.table("stems")
            .select("stem_type, storage_path")
            .eq("source_track_id", source_track_id) # Query by the correct FK column
            .execute()
        )
        if response.data:
            existing_stems = {row["stem_type"]: row["storage_path"] for row in response.data}
            if existing_stems:
                 logger.info(f"Found {len(existing_stems)} existing stems for {source_track_id}.")
                 return existing_stems
    except Exception as e:
        logger.error(f"Supabase error checking stems for {source_track_id}: {e}", exc_info=True)
        return {}

async def record_new_stems(source_track_id: str, stem_paths: Dict[str, str], model_used: str, supabase: AsyncClient) -> None:
    """Records newly generated stem paths into the Supabase 'stems' table."""
    if supabase is None: # Guard clause
        logger.error("Supabase client not provided to record_new_stems_explicit.")
        return
    logger.debug(f"Recording {len(stem_paths)} new stems for source_track_id: {source_track_id}")
    records_to_insert = [
        { "source_track_id": source_track_id, "stem_type": st, "storage_path": sp, "demucs_model_used": model_used }
        for st, sp in stem_paths.items()
     ]
    if not records_to_insert: return

    try:
        await supabase.table("stems").insert(records_to_insert).execute()
        logger.info(f"Successfully recorded new stems for {source_track_id}.")
    except Exception as e:
        # Consider potential race condition if another process inserted concurrently
        if "duplicate key value violates unique constraint" in str(e):
             logger.warning(f"Stems for {source_track_id} likely inserted concurrently. Ignoring duplicate error.")
        else:
            logger.error(f"Supabase error recording stems for {source_track_id}: {e}", exc_info=True)
            # Decide how to handle: raise error? proceed without recording?

'''
def run_demucs_sync(downloaded_file_path: str, output_base_dir: str, model: str) -> Dict[str, str]:
    """
    Synchronous function to run Demucs. Designed to be run in a thread.
    Returns dict mapping stem_type -> local_file_path.
    """
    # expected_stems = ["vocals", "drums", "bass", "other"]
    expected_stems = ["vocals", "no_vocals"]  # Adjust based on your model's output
    try:
        # Create a unique output directory for this run to avoid collisions
        run_id = str(uuid.uuid4())
        specific_output_dir = os.path.join(output_base_dir, run_id)
        os.makedirs(specific_output_dir, exist_ok=True)

        # Using htdemucs_ft model by default, adjust if needed
        cmd = ["python3", "-m", "demucs", "--mp3", "--two-stems=vocals", "-n", model, "-o", specific_output_dir, downloaded_file_path]
        # cmd = ["demucs", "--mp3", "-o", specific_output_dir, downloaded_file_path] # Simpler command if model choice isn't needed

        logger.info(f"Running Demucs command: {' '.join(cmd)}")
        process = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=600) # Added timeout
        logger.info(f"Demucs output for {os.path.basename(downloaded_file_path)}:\n{process.stdout[-500:]}") # Log tail end

        # Demucs output path structure can vary. Check standard locations.
         # Example with '-n htdemucs_ft': specific_output_dir/htdemucs_ft/filename_without_ext/
        file_basename = os.path.splitext(os.path.basename(downloaded_file_path))[0]
        
        # CORRECTED LINE: Include the model name in the path, as created by the -n flag
        # The `model` variable passed into this function is the model name (e.g., 'htdemucs_ft').
        potential_stem_folder = os.path.join(specific_output_dir, model, file_basename)


        if not os.path.isdir(potential_stem_folder):
             logger.error(f"Demucs output folder not found at expected path: {potential_stem_folder}")
             # Fallback: Search within specific_output_dir for stem files directly? Less reliable.
             found_stems_in_dir = {
                 stem: os.path.join(specific_output_dir, f"{stem}.mp3")
                 for stem in expected_stems if os.path.exists(os.path.join(specific_output_dir, f"{stem}.mp3"))
             }
             if found_stems_in_dir:
                 logger.warning(f"Found stems directly in {specific_output_dir}, structure might have changed.")
                 return found_stems_in_dir
             return {} # Failed to find stems

        logger.info(f"Looking for stems in: {potential_stem_folder}")
        stem_file_paths = {}
        for stem in expected_stems:
            stem_file = os.path.join(potential_stem_folder, f"{stem}.mp3") # Expecting mp3 due to --mp3 flag
            if os.path.exists(stem_file):
                stem_file_paths[stem] = stem_file
                logger.debug(f"Found stem: {stem_file}")
            else:
                logger.warning(f"Stem file not found: {stem_file}")

        # Clean up the empty run_id folder if stems were nested deeper (e.g., inside model_name folder)
        #if not stem_file_paths and os.path.exists(specific_output_dir):
        #    try: os.rmdir(specific_output_dir) # Only removes if empty
        #    except OSError: pass

        return stem_file_paths

    except subprocess.TimeoutExpired:
        logger.error(f"Demucs command timed out for {downloaded_file_path}")
        return {}
    except subprocess.CalledProcessError as e:
        logger.error(f"Demucs execution failed for {downloaded_file_path}. Error: {e}\nStderr:\n{e.stderr}")
        return {}
    except Exception as e:
         logger.error(f"Unexpected error running Demucs for {downloaded_file_path}: {e}", exc_info=True)
         return {}
'''


async def download_and_separate_audio(source_track_id: str, youtube_id: str, model: str, supabase: AsyncClient) -> Dict[str, str]:
    """
    Downloads audio from YouTube, runs Demucs, uploads stems, and records them.
    Returns dict mapping stem_type -> storage_path.
    """
    if not youtube_id:
        logger.warning(f"No YouTube ID provided for source track {source_track_id}. Cannot download.")
        return {}
    
    youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"
    downloaded_file_path = None
    temp_dir_obj = tempfile.TemporaryDirectory()
    temp_dir_path = temp_dir_obj.name

    try:
        # 1. Download Audio (using yt-dlp)
        logger.info(f"Starting download for YT ID: {youtube_id} (Source: {source_track_id})")
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(temp_dir_path, f'{source_track_id}.%(ext)s'), # Use source_track_id for filename
            'quiet': True,
            'no_warnings': True,
            'postprocessors': [{ # Ensure output is mp3 for consistency
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192', # Adjust quality as needed
            }],
        }

        def download_sync():
            with YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(youtube_url, download=True)
                    # ydl.prepare_filename(info) is tricky with postprocessors, construct expected path
                    expected_path = os.path.join(temp_dir_path, f'{source_track_id}.mp3')
                    if os.path.exists(expected_path):
                        logger.info(f"Successfully downloaded and converted to MP3: {expected_path}")
                        return expected_path
                    else:
                         logger.error(f"Expected download file path not found after download: {expected_path}")
                         # Look for other extensions just in case postprocessing failed silently
                         for ext in ['webm', 'm4a', 'ogg', 'wav', 'flac']:
                             alt_path = os.path.join(temp_dir_path, f'{source_track_id}.{ext}')
                             if os.path.exists(alt_path):
                                 logger.warning(f"Found downloaded file as {ext}, conversion might have failed. Using this file.")
                                 # Ideally, convert it here if needed, but Demucs might handle it
                                 return alt_path
                         return None # Truly couldn't find it
                except Exception as download_err:
                    logger.error(f"yt-dlp download failed for {youtube_url}: {download_err}")
                    return None

        downloaded_file_path = await asyncio.to_thread(download_sync)
        if not downloaded_file_path:
            raise FileNotFoundError(f"Failed to download or locate audio for {youtube_url}")

        # 2. Run Demucs (in a thread) OLD STEP
        # logger.info(f"Running Demucs for: {downloaded_file_path}")
        # demucs_output_base_dir = os.path.join(temp_dir_path, "demucs_output")
        # os.makedirs(demucs_output_base_dir, exist_ok=True)
        # local_stem_paths = await asyncio.to_thread(run_demucs_sync, downloaded_file_path, demucs_output_base_dir, model)

        # if not local_stem_paths:
        #     raise RuntimeError(f"Demucs failed to produce stems for {source_track_id}")

        # logger.info(f"Demucs finished. Found stems: {list(local_stem_paths.keys())}")


        # NEW STEP: Use Demucs GPU Service
        logger.info(f"Sending {os.path.basename(downloaded_file_path)} to demucs_modal_separator_service")
        # Read the downloaded audio file into memory
        with open(downloaded_file_path, "rb") as f:
            audio_data = f.read()

            # Get a handle to our deployed Modal function
        separate_audio_func = modal.Function.from_name("demucs-separator-service", "separate_audio")
        
        successfully_uploaded_stems = separate_audio_func.remote(
        audio_bytes=audio_data, 
        original_filename=os.path.basename(downloaded_file_path),
        source_track_id=source_track_id, # <-- Pass the ID for storage path
        )
        
        if not successfully_uploaded_stems:
            raise RuntimeError("Modal service did not return any uploaded stem paths.")

        logger.info(f"Modal service reported successful uploads: {successfully_uploaded_stems}")

        # Record the new stems in our database (this is still the orchestrator's job)
        await record_new_stems(source_track_id, successfully_uploaded_stems, model, supabase=supabase)

        return successfully_uploaded_stems

    except Exception as e:
        logger.error(f"Error processing audio for source {source_track_id} (YT: {youtube_id}): {e}", exc_info=True)
        return {}
    finally:
        temp_dir_obj.cleanup()
        logger.debug(f"Cleaned up temporary directory: {temp_dir_path}")


        # 3. Upload Stems to Supabase Storage (concurrently)  --------OLD STEP----------
        # upload_tasks = []
        # uploaded_storage_paths = {}
        # stem_upload_details = []  # Initialize the list to store details for each stem
        # for stem_type, local_path in local_stem_paths.items():
        #     storage_path = get_stem_storage_path(source_track_id, stem_type)
        #     # Populate stem_upload_details with the necessary information
        #     async def upload_task(l_path, s_path):
        #         with open(l_path, 'rb') as f:
        #             # Use the async upload method
        #             await supabase.storage.from_(BUCKET_NAME).upload(s_path, f)
            
        #     upload_tasks.append(upload_task(local_path, storage_path))

        # # Store the paths to map results back
        # uploaded_storage_paths = {st: get_stem_storage_path(source_track_id, st) for st in local_stem_paths.keys()}

        # upload_results = await asyncio.gather(*upload_tasks, return_exceptions=True)
        # successfully_uploaded_stems = {}
        # for stem_type, storage_path in uploaded_storage_paths.items():
        #      # To confirm success, you could try to get the public URL or list the files.
        #      # For simplicity, we'll assume no exception means success.
        #      # Let's find the corresponding result
        #      index = list(uploaded_storage_paths.keys()).index(stem_type)
        #      if not isinstance(upload_results[index], Exception):
        #          logger.info(f"Successfully uploaded stem '{stem_type}' to {storage_path} for {source_track_id}.")
        #          successfully_uploaded_stems[stem_type] = storage_path
        #      else:
        #          logger.error(f"Exception during upload of stem '{stem_type}' to {storage_path} for {source_track_id}: {upload_results[index]}", exc_info=upload_results[index])

        # logger.info(f"Finished uploading. {len(successfully_uploaded_stems)}/{len(local_stem_paths)} stems successfully uploaded for {source_track_id}.")

        # if successfully_uploaded_stems:
        #     await record_new_stems(source_track_id, successfully_uploaded_stems, model, supabase=supabase)
        # else:
        #     logger.warning(f"No stems were successfully uploaded for {source_track_id}. Nothing to record in database.")

        # return successfully_uploaded_stems

    # except Exception as e:
    #     logger.error(f"Error processing audio for source {source_track_id} (YT: {youtube_id}): {e}", exc_info=True)
    #     return {}
    # finally:
    #     temp_dir_obj.cleanup()
    #     logger.debug(f"Cleaned up temporary directory: {temp_dir_path}")


async def _get_or_create_stems_for_track(src_id: str, yt_id: Optional[str], model: str, supabase_client: AsyncClient) -> tuple[str, Dict[str, str]]:
    """
    Top-level helper to handle the logic for a single track.
    This avoids nested function definitions and closure issues.
    """
    # Pass the client explicitly to every function call
    existing_stems = await check_and_retrieve_existing_stems(src_id, supabase_client)
    if existing_stems:
        return src_id, existing_stems
    
    if yt_id:
        return src_id, await download_and_separate_audio(src_id, yt_id, model, supabase_client)
        
    logger.error(f"Cannot process stems for {src_id}: No existing stems and no YouTube ID provided.")
    return src_id, {}

# --- Main Orchestration Function ---

async def process_unique_tracks_stems(
    source_tracks_to_process: Dict[str, Optional[str]], # { source_track_id: youtube_id or None }
    model: str,
    supabase: AsyncClient
) -> Dict[str, Dict[str, str]]:
    """
    Processes stems (check existing, download, separate, upload, record)
    concurrently for each unique source track ID provided.
    Returns a dictionary mapping source_track_id to its available stem paths.
    """
    if not source_tracks_to_process:
        logger.warning("No source tracks provided for stem processing.")
        return {}

    logger.info(f"Starting stem processing for {len(source_tracks_to_process)} unique tracks using injected client.")

    tasks = [
        _get_or_create_stems_for_track(src_id, yt_id, model, supabase)
        for src_id, yt_id in source_tracks_to_process.items()
    ]
    
    processed_results = await asyncio.gather(*tasks)
    all_available_stem_paths = {src_id: paths for src_id, paths in processed_results if paths}
    logger.info(f"Stem processing complete. Stems available for {len(all_available_stem_paths)} source tracks.")

    logger.info(f"Stem processing complete. Stems available for {len(all_available_stem_paths)} source tracks.")
    return all_available_stem_paths