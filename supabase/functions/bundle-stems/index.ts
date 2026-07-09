import { serve } from 'https://deno.land/std@0.208.0/http/server.ts' 
import * as zip from 'https://deno.land/x/zipjs@v2.7.29/index.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StemData {
  path: string;
  url: string;
}

serve(async (req: Request) => {
  console.log(`[START] Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS] Handling preflight request.');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[POST] Processing POST request.');
    const { stem_urls } = await req.json();
    if (!stem_urls || typeof stem_urls !== 'object') {
      console.error('[ERROR] stem_urls object is missing or invalid.');
      return new Response(JSON.stringify({ error: 'stem_urls object is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.log('[LOG] Successfully parsed request body.');

    const stemsToFetch: StemData[] = Object.entries(stem_urls).map(([path, url]) => ({
      path: path as string,
      url: url as string,
    }));
    console.log(`[LOG] Preparing to fetch ${stemsToFetch.length} stems.`);

    // Fetch all audio files in parallel
    const audioBlobs = await Promise.all(
      stemsToFetch.map(async (stem, index) => {
        console.log(`[FETCH START] Fetching stem ${index + 1}: ${stem.path}`);
        const response = await fetch(stem.url);
        if (!response.ok) {
          console.error(`[FETCH FAIL] Failed to fetch ${stem.path} with status: ${response.status}`);
          throw new Error(`Failed to fetch internal resource: ${stem.path}`);
        }
        const blob = await response.blob();
        console.log(`[FETCH SUCCESS] Fetched stem ${index + 1} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        return { path: stem.path, blob };
      })
    );
    console.log('[LOG] All stems fetched successfully.');
    
    // Create a ZIP file in memory
    console.log('[ZIP START] Creating ZIP file in memory.');
    const blobWriter = new zip.BlobWriter('application/zip');
    const zipWriter = new zip.ZipWriter(blobWriter);

    await Promise.all(
      audioBlobs.map(({ path, blob }) => zipWriter.add(path, new zip.BlobReader(blob)))
    );

    await zipWriter.close();
    const zipBlob = await blobWriter.getData();
    console.log(`[ZIP SUCCESS] ZIP file created (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB).`);
    
    // Return the ZIP file
    console.log('[END] Sending ZIP blob as response.');
    return new Response(zipBlob, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="stems.zip"',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('[FATAL ERROR]', error); // Log the full error object
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
})