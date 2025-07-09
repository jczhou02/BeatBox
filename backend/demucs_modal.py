import modal
import os
import zipfile
import subprocess
import tempfile
import uuid
import shutil
from supabase import create_client, Client
from typing import Dict

app = modal.App("demucs-separator-service")

# Define the container image. This is like a Dockerfile but in Python.
# It runs once to build the environment on Modal's servers.
demucs_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg")  # Install ffmpeg, a common dependency for audio tools
    .pip_install(
        "demucs",
        "torch",
        "torchaudio",
        "torchvision",
        "supabase"
    )
)
supabase_secret = modal.Secret.from_name("supabase-secret")
@app.function(
    image=demucs_image,
    gpu="T4",  # Request a T4 GPU. Other options: "A10G", "A100", etc.
    timeout=600,  # Set a 10-minute timeout for long audio files
    secrets=[supabase_secret],  # Use the Supabase secret for database access
    )
def separate_audio(audio_bytes: bytes, original_filename: str, source_track_id: str) -> Dict[str, str]:
    """
    This function runs remotely on a Modal GPU instance.
    It receives audio as bytes and returns a zip file of the stems as bytes.
    """
    # Create a temporary directory on the remote worker
    temp_dir = tempfile.mkdtemp()

    supa_url = os.environ["SUPABASE_URL"]
    supa_key = os.environ["SUPABASE_SERVICE_KEY"]
    supabase: Client = create_client(supa_url, supa_key)
    
    BUCKET_NAME = os.environ.get("SUPABASE_BUCKET", "stems")
    
    try:
        # 2. Run Demucs (same as before)
        temp_audio_path = os.path.join(temp_dir, original_filename)
        with open(temp_audio_path, "wb") as f: f.write(audio_bytes)
        
        print(f"Received {original_filename}, starting separation...")
        output_dir = os.path.join(temp_dir, "separated")
        model_name = "htdemucs"
        
        command = ["python", "-m", "demucs", "-o", output_dir, "--mp3", "--two-stems=vocals", "-n", model_name, temp_audio_path]
        subprocess.run(command, check=True, capture_output=True, text=True)
        print("Demucs processing finished.")

        # 3. Upload stems from the output directory to Supabase
        stems_path = os.path.join(output_dir, model_name, os.path.splitext(original_filename)[0])
        
        uploaded_stem_paths: Dict[str, str] = {}
        
        for stem_filename in os.listdir(stems_path):
            stem_type = os.path.splitext(stem_filename)[0]
            storage_path = f"stems/{source_track_id}/{stem_type}.mp3"
            local_stem_path = os.path.join(stems_path, stem_filename)

            try:
                with open(local_stem_path, 'rb') as f:
                    # Note: Supabase client v2 uses a sync `upload` method.
                    # This is fine since we are in a sync function.
                    print(f"Uploading {stem_filename} to {storage_path}...")
                    supabase.storage.from_(BUCKET_NAME).upload(
                        path=storage_path,
                        file=f,
                        file_options={"content-type": "audio/mpeg", "upsert": "true"}
                    )
                uploaded_stem_paths[stem_type] = storage_path
                print(f"Upload successful for {stem_filename}.")
            except Exception as e:
                print(f"ERROR: Failed to upload {stem_filename}: {e}")
        
        # 4. Return the small dictionary of storage paths
        return uploaded_stem_paths

    finally:
        shutil.rmtree(temp_dir)