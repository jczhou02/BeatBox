# backend/app/mashup_service.py
import asyncio
import random
from typing import List, Dict, Optional, Tuple, Set, Any
import logging
import itertools
from fastapi import Depends
from thefuzz import fuzz
# Import necessary components from other modules
from .schemas import MashupPayload, MashupResult, InputTrack, InputSection
from .audio_processor import process_unique_tracks_stems
from .pairing import create_pairings
from .hooktheory import create_timeline_from_pairings
from .dependencies import get_supabase_client # Import the dependency for Supabase client
from supabase import AsyncClient # Import Client if needed directly for type hint
from app.utils import create_signed_url_sync # Use sync version for to_thread
from app.config import get_settings # Import settings if needed for Supabase client
from .musictheory_utils import get_camelot_neighbors, get_camelot_number, get_section_category # Import necessary key utils

logger = logging.getLogger(__name__)
settings = get_settings() # Get settings once
BUCKET_NAME = settings.SUPABASE_BUCKET
SIGNED_URL_EXPIRES_IN = settings.SIGNED_URL_EXPIRES_IN

HOOKTHEORY_COLUMNS_STR = ", ".join([ # Define columns here or import
    "hooktheory_section_id", "source_track_id", "artist", "title",
    "section_name", "key", "scale", "bpm", "meter", "chord_progression",
    "melody", "youtube_id", "start_time_s", "end_time_s",
    "section_duration_ms", "genre", "cp_compare"
])
CP_FUZZY_SIMILARITY_THRESHOLD = 85


async def _identify_source_tracks(tracks: List[InputTrack]) -> Tuple[Dict[str, Optional[str]], Set[str]]:
    """Helper to extract unique source tracks and anchor IDs."""
    source_tracks: Dict[str, Optional[str]] = {}
    anchor_ids: Set[str] = set()
    for track in tracks:
        is_anchor = track.anchor
        for section in track.sections:
            src_id = section.source_track_id
            if is_anchor:
                anchor_ids.add(src_id)
            if src_id not in source_tracks:
                 source_tracks[src_id] = section.youtube_id
            elif not source_tracks[src_id] and section.youtube_id:
                 source_tracks[src_id] = section.youtube_id
    logger.debug(f"Identified {len(source_tracks)} unique source tracks, {len(anchor_ids)} anchor IDs.")
    return source_tracks, anchor_ids

async def _generate_signed_urls(required_paths: Set[str], supabase: AsyncClient) -> Dict[str, str]:
    """Helper to generate signed URLs concurrently."""
    if not required_paths: return {}

    signed_url_tasks = []
    # The path_to_type_map is no longer needed for the final dictionary key
    for path in required_paths:
        task = supabase.storage.from_(BUCKET_NAME).create_signed_url(path, SIGNED_URL_EXPIRES_IN)
        signed_url_tasks.append(task)

    logger.debug(f"Attempting to generate {len(signed_url_tasks)} signed URLs using asyncio.gather.")
    # Run all the coroutines concurrently
    results = await asyncio.gather(*signed_url_tasks, return_exceptions=True)

    final_urls: Dict[str, str] = {}
    paths_list = list(required_paths) # Maintain order for matching results

    for i, res in enumerate(results):
        original_path = paths_list[i]

        if isinstance(res, Exception):
            logger.error(f"Failed to generate signed URL for {original_path}: {res}")
        # The async method returns a dictionary {'signedURL': '...'}
        elif res and isinstance(res, dict) and 'signedURL' in res:
            final_urls[original_path] = res['signedURL']
        else:
            logger.error(f"Signed URL generation returned an unexpected value for {original_path}: {res}")

    logger.info(f"Successfully generated {len(final_urls)} signed URLs.")
    return final_urls


async def generate_mashup(payload: MashupPayload, supabase: AsyncClient) -> MashupResult: # Add mode/count params
    """
    Main service function to orchestrate the entire mashup generation process.
    Includes optional track augmentation based on 'mode'.
    """
    mode = payload.mode
    augment_count = payload.numSuggestions if payload.numSuggestions else 1
    temperature = payload.temperature if payload.temperature else 0.3 # Default low temp
    logger.info(f"Starting mashup generation service... Mode: {mode}, Augment Count: {augment_count}, Temperature: {temperature}")

    initial_tracks = payload.tracks
    processed_payload_tracks = list(initial_tracks) # Start with a copy

    # --- Augmentation Logic ---
    if augment_count > 0:
        processed_suggestion_ids = {s.source_track_id for t in initial_tracks for s in t.sections}
        if len(initial_tracks) == 1 and not initial_tracks[0].anchor:
            # Scenario 1: Single non-anchor track provided, need to find *one* anchor
            logger.info("Mode: Augmenting to find a compatible anchor track.")
            user_track = initial_tracks[0]
            ref_section = None
            # --- Find preferred reference section (Drop/Chorus) ---
            if user_track.sections:
                # Try to find a 'Drop' section first
                ref_section = next((s for s in user_track.sections if get_section_category(s.section_name) == 'Drop'), None)
                # If no 'Drop', fallback to the first section
                if not ref_section:
                    ref_section = user_track.sections[-1]   #  TODO: review whether this selection is appropriate
            # --- End finding reference section ---

            if not ref_section:
                 logger.error("Could not determine a reference section from the user's track for augmentation.")
                 raise ValueError("User track has no sections to use as augmentation reference.")

            logger.info(f"Using user track section '{ref_section.section_name}' (ID: {ref_section.hooktheory_section_id}) as reference.")
            exclude_ids = {ref_section.source_track_id}
            found_anchors = await fetch_compatible_sections_from_db(ref_section, augment_count, exclude_ids, supabase=supabase, temperature=temperature)
            if not found_anchors:
                logger.error("No compatible anchor sections found for augmentation.")
                raise ValueError("No compatible anchor sections found for the provided user track.")
            
            for i, top_section in enumerate(found_anchors):
                top_track_id = top_section.source_track_id
                if top_track_id in processed_suggestion_ids:
                    logger.debug(f"Skipping already processed anchor track {top_track_id}.")
                    continue
                sibling_sections = await _get_all_sections_for_track(top_track_id, supabase=supabase)
                logger.debug(f"sibling_sections for anchor track {top_track_id}: {sibling_sections}")
                if not sibling_sections:
                    logger.warning(f"No sections found for anchor track {top_track_id}. Skipping.")
                    continue
                is_primary_anchor = (i == 0) # First found is primary anchor
                new_track = InputTrack(anchor=is_primary_anchor, sections=sibling_sections)
                processed_payload_tracks.append(new_track)
                logger.info(f"Added suggestion track: {sibling_sections[0].artist} - {sibling_sections[0].title} ({len(sibling_sections)} sections)")

        elif any(t.anchor for t in initial_tracks):
            # Scenario 2: Anchor exists, find suggestions
            logger.info(f"Mode: Augmenting with {augment_count} suggestion tracks.")
            primary_anchor_track = next((t for t in initial_tracks if t.anchor), None)
            if primary_anchor_track:
                anchor_ref_section = None
                # --- Find preferred reference section (Drop/Chorus) ---
                if primary_anchor_track.sections:
                    # Try to find a 'Drop' section first
                    anchor_ref_section = next((s for s in primary_anchor_track.sections if get_section_category(s.section_name) == 'Drop'), None)
                    # If no 'Drop', fallback to a later section
                    if not anchor_ref_section:
                        anchor_ref_section = primary_anchor_track.sections[-1]
                # --- End finding reference section ---

                if not anchor_ref_section:
                    logger.error("Could not determine a reference section from the anchor track for augmentation.")
                    # Proceed without augmentation? Or raise error? Let's proceed.
                    logger.warning("Proceeding without augmentation as no reference section found.")
                else:
                    logger.info(f"Using anchor section '{anchor_ref_section.section_name}' (ID: {anchor_ref_section.hooktheory_section_id}) as reference for finding suggestions.")
                    exclude_ids = {s.source_track_id for t in initial_tracks for s in t.sections}
                    found_suggestions = await fetch_compatible_sections_from_db(anchor_ref_section, augment_count, exclude_ids, supabase=supabase, temperature=temperature)

                    for top_section in found_suggestions:
                        top_track_id = top_section.source_track_id
                        if top_track_id in processed_suggestion_ids:
                            logger.debug(f"Skipping already processed suggestion track {top_track_id}.")
                            continue
                        sibling_sections = await _get_all_sections_for_track(top_track_id, supabase=supabase)
                        if not sibling_sections:
                            logger.warning(f"No sections found for suggestion track {top_track_id}. Skipping.")
                            continue
                        suggestion_track = InputTrack(anchor=False, sections=sibling_sections)
                        processed_payload_tracks.append(suggestion_track)
                        logger.info(f"Added suggestion track: {sibling_sections[0].artist} - {sibling_sections[0].title} ({len(sibling_sections)} sections)")

    # --- END Augmentation Logic ---

    # === Proceed with the rest of the mashup logic using processed_payload_tracks ===
    logger.info(f"Total tracks: {len(processed_payload_tracks)}")

    # 1. Identify Tracks & Process Stems (using potentially augmented list)
    source_tracks, anchor_src_ids = await _identify_source_tracks(processed_payload_tracks)
    logger.info(f"source_tracks: {source_tracks}")
    logger.info(f"anchor_src_ids: {anchor_src_ids}")
    if not anchor_src_ids:
        # This can happen if augmentation failed to find an anchor in scenario 1
        logger.error("No anchor track ID identified after augmentation checks.")
        raise ValueError("Mashup generation requires an anchor track.")

    all_available_stem_paths = await process_unique_tracks_stems(source_tracks, model="mdx_extra_q", supabase=supabase)

    # Validate anchor stems are present
    if not anchor_src_ids.issubset(all_available_stem_paths.keys()):
        missing_anchors = anchor_src_ids - all_available_stem_paths.keys()
        logger.error(f"Missing stems for essential anchor tracks: {missing_anchors}")
        raise ValueError(f"Missing stems for required anchor tracks: {missing_anchors}")

    # 2. Create Pairings (using potentially augmented list)
    pairings = create_pairings(processed_payload_tracks)
    if not pairings:
        logger.warning("Pairing logic resulted in no pairings.")
        # Consider raising ValueError if augmentation was expected to provide pairs
        if mode and not pairings:
             raise ValueError("Augmentation did not result in any valid pairings.")
        elif not pairings:
             # Proceed but expect an empty timeline? Or raise error?
             raise ValueError("Failed to create pairings between provided/augmented tracks.")


    # 3. Generate Timeline
    timeline_json, required_stem_paths = await create_timeline_from_pairings(
        pairings,
        all_available_stem_paths,
    )
    if not timeline_json['tracks'] or not required_stem_paths: # Check if tracks/clips were actually added
        logger.error("Timeline generation failed or resulted in an empty timeline.")
        raise ValueError("Failed to generate mashup arrangement.")

    # 4. Generate Signed URLs
    final_stem_urls = await _generate_signed_urls(required_stem_paths, supabase=supabase)

    logger.info("Mashup generation service completed successfully.")
    return MashupResult(timeline=timeline_json, stem_urls=final_stem_urls)



# Helper to get compatible keys (avoids duplicating logic)
def get_compatible_key_list(anchor_key: Optional[str]) -> List[str]:
    """Gets a list of keys compatible with the anchor key (including itself)."""
    if not anchor_key:
        return []

    compatible_keys = []
    anchor_camelot = get_camelot_number(anchor_key)
    if anchor_camelot:
        num, type = anchor_camelot
        neighbors = get_camelot_neighbors(num, type)
        # Need to convert Camelot tuples back to key strings (requires reverse lookup or predefined list)
        # This is complex. A simpler DB approach might be needed if full compatibility in DB query is hard.
        # Let's stick to filtering by exact key in DB for now and re-filtering in Python for simplicity,
        # OR accept that the DB query might be slightly less comprehensive.

        # --> Simpler approach for now: Query DB for exact key OR filter later in Python.
        # --> Let's keep the DB query simple and rely on Python filtering.
        return [anchor_key] # Keep DB query simpler for now
    else:
        return [anchor_key] # Return just the anchor key if Camelot fails


EXACT_MATCH_SCORE = 150.0
# Small epsilon to avoid math issues with zero scores/weights when temp > 0
EPSILON = 1e-9

# --- Weighted Sampling Helper ---
def weighted_sample_without_replacement(population: List[Any], weights: List[float], k: int) -> List[Any]:
    """
    Selects k unique items from population based on weights.
    Based on algorithm by Efraimidis and Spirakis for weighted random sampling.
    """
    if not isinstance(k, int) or k <= 0:
        return []
    k = min(k, len(population)) # Cannot select more than available unique items

    # Calculate a random key for each item: key = random_number^(1/weight)
    # We need weight > 0 for this. Add EPSILON to weights.
    elt_keys = []
    for i in range(len(population)):
        w = weights[i] + EPSILON
        r = random.uniform(0.0, 1.0)
        # Handle potential math errors with r=0 or w being huge/tiny
        try:
            key = r**(1.0/w)
        except (ValueError, OverflowError):
            # Assign a very small key if calculation fails (low priority)
             key = -float('inf') # Or handle differently, e.g., skip? For now, make it lowest priority.
        elt_keys.append((key, population[i]))


    # Sort by the random keys in descending order
    elt_keys.sort(key=lambda x: x[0], reverse=True)

    # Return the elements corresponding to the top k keys
    return [item for key, item in elt_keys[:k]]


async def fetch_compatible_sections_from_db(
    ref_section: InputSection,
    count: int,
    exclude_source_ids: Set[str],
    supabase: AsyncClient,
    temperature: float = 0.3 # Default low temp (near deterministic)
) -> List[InputSection]:
    """
    Fetches compatible sections based on harmonic rules and selects 'count' sections
    using a temperature-controlled weighted random sampling based on match quality.

    Args:
        ref_section: The reference section.
        count: The desired number of compatible sections.
        exclude_source_ids: Set of source_track_ids to exclude.
        supabase: Supabase client instance.
        temperature: Controls randomness (0=deterministic best, >0 increases randomness).
                     Must be non-negative.
    """
    logger.info(f"Augmenting: Fetching candidates compatible with anchor {ref_section.hooktheory_section_id} (Count: {count}, Temp: {temperature})")

    # if not anchor_section.key or not anchor_section.cp_compare:
    #     logger.warning("Anchor section missing key or cp_compare. Cannot effectively augment.")
    #     return []
    if not ref_section.key:
        logger.warning("Anchor section missing key. Cannot effectively augment.")
        return []
    if not ref_section.cp_compare:
        logger.warning("Anchor section missing cp_compare. Cannot effectively augment.")
        return []

    # --- 2. Build and Execute the Advanced Multi-Stage Query ---
    LIMIT_FOR_SAMPLING = max(count * 10, 100) # Fetch a slightly larger pool for ranking
    
    # Normalize the anchor progression IN PYTHON first, so we don't call the function repeatedly in the query
    # This is a small optimization.
    normalized_anchor_cp = ''.join(k for k, g in itertools.groupby(ref_section.cp_compare))


    params = {
    'anchor_key_root': ref_section.key,
    'anchor_scale': ref_section.scale,
    'anchor_cp_raw': ref_section.cp_compare,
    'exclude_ids': list(exclude_source_ids | {ref_section.source_track_id}),
    'result_limit': LIMIT_FOR_SAMPLING
    }

    try:
        # The RPC call is clean and sends structured data, avoiding all parsing errors
        response = await supabase.rpc('find_compatible_sections', params).execute()
        
        if not response.data:
            logger.warning("No compatible candidates returned from DB RPC.")
            return []
    except Exception as e:
        # This will now catch genuine connection errors or errors within the SQL function itself
        logger.error(f"Supabase RPC error calling 'find_compatible_sections': {e}", exc_info=True)
        return []

    # --- 2. Process DB Results and Calculate Final Score in Python ---
    # This part remains the same, but it's now operating on the perfectly sorted
    # list returned by our powerful database function.
    
    all_candidates_with_scores = []
    normalized_anchor_cp = ''.join(k for k, g in itertools.groupby(ref_section.cp_compare))

    for row in response.data:
        try:
            # We need to calculate the score here for the temperature sampling,
            # since the DB only did the sorting for us.
            candidate_cp = row.get('cp_compare', '')
            candidate_cp_norm = ''.join(k for k, g in itertools.groupby(candidate_cp))
            
            max_len = max(len(normalized_anchor_cp), len(candidate_cp_norm), 1)
            
            # We don't have the Levenshtein distance, so we must recalculate it.
            # This is a small, acceptable trade-off for the robustness of the RPC call.
            # A more advanced (but complex) solution would be to have the RPC return the score too.
            # For now, this is fine.
            from Levenshtein import distance as levenshtein_distance # A fast C library
            distance = levenshtein_distance(normalized_anchor_cp, candidate_cp_norm)
            
            score = 1.0 - (distance / max_len)
            
            if candidate_cp.startswith(ref_section.cp_compare):
                score += 0.5

            score = max(0, score)

            section = InputSection(**row)
            all_candidates_with_scores.append((section, score))
        except Exception as parse_err:
            logger.warning(f"Skipping row due to parsing error: {parse_err} - Row: {row}")

    # --- 3. Final Selection Logic (This is unchanged) ---
    if not all_candidates_with_scores:
        logger.warning("No valid candidates remained after scoring.")
        return []

    # The list from the DB is already sorted optimally, but we re-sort by our Python-calculated score
    all_candidates_with_scores.sort(key=lambda x: x[1], reverse=True)

    population = [item[0] for item in all_candidates_with_scores]
    scores = [item[1] for item in all_candidates_with_scores]

    if temperature < EPSILON:
        logger.debug("Temperature near zero. Selecting deterministically based on final score.")
        selected_sections = population[:count]
    else:
        logger.debug(f"Temperature > 0. Performing weighted random sampling on {len(population)} candidates.")
        try:
            weights = [(s + EPSILON)**(1.0 / temperature) for s in scores]
            selected_sections = weighted_sample_without_replacement(population, weights, k=count)
        except (OverflowError, ValueError) as e:
             logger.error(f"Numerical error during weight calculation/sampling (temp={temperature}): {e}. "
                          "Falling back to deterministic selection.", exc_info=True)
             selected_sections = population[:count]

    logger.info(f"Selected {len(selected_sections)} sections using temp {temperature}. IDs: {[s.hooktheory_section_id for s in selected_sections]}")
    return selected_sections



async def _get_all_sections_for_track(
    source_track_id: str,
    supabase: AsyncClient
) -> List[InputSection]:
    """
    A simple helper to fetch all sections for a given source_track_id.
    """
    logger.debug(f"Hydrating all sections for source_track_id: {source_track_id}")
    try:
        response = await (
            supabase.table("hooktheory")
            .select("*")
            .eq("source_track_id", source_track_id)
            # .order("Start Timestamp (s)", desc=False) # Ensure canonical order
            .execute()
        )
        if not response.data:
            return []
        
        return [InputSection(**row) for row in response.data]
    except Exception as e:
        logger.error(f"Failed to hydrate sections for {source_track_id}: {e}", exc_info=True)
        return []