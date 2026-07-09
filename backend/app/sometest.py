import os
from app.config import get_settings
from app.utils import upload_file_and_get_signed_url

settings = get_settings()
bucket = settings.SUPABASE_BUCKET
storage_path = "test_folder/test_file.mp3"

# Create some dummy data (or load a local file)
file_data = b"This is a test file."

try:
    signed_url = upload_file_and_get_signed_url(bucket, storage_path, file_data, expires_in=3600)
    print("Test signed URL:", signed_url)
except Exception as e:
    print("Error during upload test:", e)
