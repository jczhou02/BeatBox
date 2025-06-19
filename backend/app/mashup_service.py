# backend/app/mashup_service.py
import asyncio
import random
from typing import List, Dict, Optional, Tuple, Set, Any
import logging
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
from .musictheory_utils import keys_compatible, get_camelot_neighbors, get_camelot_number, get_section_category # Import necessary key utils

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
    if mode == "mashup-plus":
        if len(initial_tracks) == 1 and not initial_tracks[0].anchor:
            # Scenario 1: Single non-anchor track provided, need to find *one* anchor
            logger.info("Mode: Augmenting to find a compatible anchor track.")
            user_track = initial_tracks[0]
            anchor_ref_section = None
            # --- Find preferred reference section (Drop/Chorus) ---
            if user_track.sections:
                # Try to find a 'Drop' section first
                anchor_ref_section = next((s for s in user_track.sections if get_section_category(s.section_name) == 'Drop'), None)
                # If no 'Drop', fallback to the first section
                if not anchor_ref_section:
                    anchor_ref_section = user_track.sections[0]
            # --- End finding reference section ---

            if not anchor_ref_section:
                 logger.error("Could not determine a reference section from the user's track for augmentation.")
                 raise ValueError("User track has no sections to use as augmentation reference.")

            logger.info(f"Using user track section '{anchor_ref_section.section_name}' (ID: {anchor_ref_section.hooktheory_section_id}) as reference.")
            exclude_ids = {anchor_ref_section.source_track_id}
            found_anchors = await fetch_compatible_sections_from_db(anchor_ref_section, 1, exclude_ids, supabase=supabase, temperature=temperature)
            if found_anchors:
                anchor_section = found_anchors[0]
                 # Create a new InputTrack for this anchor (ensure all its sections are fetched?)
                # NOTE: fetch_compatible_sections_from_db currently returns *sections*.
                # We might need to fetch *all* sections for the chosen anchor track's source_id
                # For simplicity now, we assume the found section is sufficient representative for the anchor track.
                # Create a new InputTrack for this anchor
                anchor_track = InputTrack(anchor=True, sections=[anchor_section])
                processed_payload_tracks.insert(0, anchor_track) # Add the new anchor track
                logger.info(f"Found and added compatible anchor: {anchor_section.artist} - {anchor_section.title} ({anchor_section.hooktheory_section_id})")
            else:
                logger.error("Failed to find a compatible anchor section for augmentation.")
                raise ValueError("Could not find a compatible anchor track to augment the request.")

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
                    # If no 'Drop', fallback to the first section
                    if not anchor_ref_section:
                        anchor_ref_section = primary_anchor_track.sections[0]
                # --- End finding reference section ---

                if not anchor_ref_section:
                    logger.error("Could not determine a reference section from the anchor track for augmentation.")
                    # Proceed without augmentation? Or raise error? Let's proceed.
                    logger.warning("Proceeding without augmentation as no reference section found.")
                else:
                    logger.info(f"Using anchor section '{anchor_ref_section.section_name}' (ID: {anchor_ref_section.hooktheory_section_id}) as reference for finding suggestions.")
                    exclude_ids = {s.source_track_id for t in initial_tracks for s in t.sections}
                    found_suggestions = await fetch_compatible_sections_from_db(anchor_ref_section, augment_count, exclude_ids, supabase=supabase, temperature=temperature)

                # Group suggestions by source_track_id into InputTrack objects
                suggestions_by_track: Dict[str, List[InputSection]] = {}
                for sugg_section in found_suggestions:
                        src_id = sugg_section.source_track_id
                        if src_id not in suggestions_by_track:
                            suggestions_by_track[src_id] = []
                        suggestions_by_track[src_id].append(sugg_section)

                for src_id, sections in suggestions_by_track.items():
                # Ensure we don't add a track if its source_id is already present
                    if not any(st.source_track_id == src_id for t in processed_payload_tracks for st in t.sections):
                        suggestion_track = InputTrack(anchor=False, sections=sections)
                        processed_payload_tracks.append(suggestion_track)
                        logger.info(f"Added augmented suggestion track: {sections[0].artist} - {sections[0].title} ({len(sections)} sections)")
                    else:
                        logger.debug(f"Skipping augmented track {src_id} as it's already in the list.")

            else:
                logger.warning("Augment suggestions requested, but no anchor track found in initial payload.")
    # --- END Augmentation Logic ---


    # === Proceed with the rest of the mashup logic using processed_payload_tracks ===
    logger.info(f"Total tracks after potential augmentation: {len(processed_payload_tracks)}")

    # 1. Identify Tracks & Process Stems (using potentially augmented list)
    source_tracks, anchor_src_ids = await _identify_source_tracks(processed_payload_tracks)
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

    compatible_keys = {anchor_key}
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
    anchor_section: InputSection,
    count: int,
    exclude_source_ids: Set[str],
    supabase: AsyncClient,
    temperature: float = 0.3 # Default low temp (near deterministic)
) -> List[InputSection]:
    """
    Fetches compatible sections based on harmonic rules and selects 'count' sections
    using a temperature-controlled weighted random sampling based on match quality.

    Args:
        anchor_section: The reference section.
        count: The desired number of compatible sections.
        exclude_source_ids: Set of source_track_ids to exclude.
        supabase: Supabase client instance.
        temperature: Controls randomness (0=deterministic best, >0 increases randomness).
                     Must be non-negative.
    """
    logger.info(f"Augmenting: Fetching candidates compatible with anchor {anchor_section.hooktheory_section_id} (Count: {count}, Temp: {temperature})")

    if not anchor_section.key or not anchor_section.cp_compare:
        logger.warning("Anchor section missing key or cp_compare. Cannot effectively augment.")
        return []
    if temperature < 0:
        logger.warning("Temperature cannot be negative. Using 0.")
        temperature = 0

    all_candidates_with_scores: List[Tuple[InputSection, float]] = []
    processed_candidate_source_ids: Set[str] = set(exclude_source_ids | {anchor_section.source_track_id})

    # --- Strategy 1: Try Exact CP Match within Anchor Key (DB Query) ---
    # Fetch more than needed initially to build a pool
    LIMIT_PER_QUERY = max(count * 5, 50) # Fetch a reasonable number for exact matches
    try:
        logger.debug(f"Augment: Querying exact match for key='{anchor_section.key}', cp_compare='{anchor_section.cp_compare}'")
        response_exact = await (
            supabase.table("hooktheory")
            .select(HOOKTHEORY_COLUMNS_STR)
            .eq('key', anchor_section.key)
            .eq('cp_compare', anchor_section.cp_compare)
            .not_.in_("source_track_id", list(processed_candidate_source_ids))
            .limit(LIMIT_PER_QUERY)
            .execute()
        )
        if response_exact.data:
            for row in response_exact.data:
                try:
                    section = InputSection(**row)
                    if section.source_track_id not in processed_candidate_source_ids:
                        # Assign high score for exact match
                        all_candidates_with_scores.append((section, EXACT_MATCH_SCORE))
                        processed_candidate_source_ids.add(section.source_track_id)
                except Exception as parse_err:
                     logger.warning(f"Skipping exact match row due to parsing error: {parse_err} - Row: {row}")
            logger.info(f"Found {len(all_candidates_with_scores)} initial sections via exact key/cp_compare DB match.")

    except Exception as e:
        logger.error(f"Supabase error during exact match query: {e}", exc_info=True)

    # --- Strategy 2: Fetch Broader Pool by Anchor Key and Filter Fuzzy/Key in Python ---
    logger.info(f"Fetching broader pool by anchor key='{anchor_section.key}' for fuzzy filtering.")

    # Fetch more candidates based on key (limit fetch size)
    MAX_CANDIDATES_TO_FETCH_FUZZY = max(count * 10, 50) # Fetch significantly more

    try:
        response_candidates = await (
            supabase.table("hooktheory")
            .select(HOOKTHEORY_COLUMNS_STR)
            .eq('key', anchor_section.key) # Still filtering by anchor key in DB
            .not_.in_("source_track_id", list(processed_candidate_source_ids)) # Exclude already processed IDs
            .neq('cp_compare', anchor_section.cp_compare) # Exclude exact CP matches for this key (already found)
            .limit(MAX_CANDIDATES_TO_FETCH_FUZZY)
            .execute()
        )
    except Exception as e:
         logger.error(f"Supabase error fetching candidates for fuzzy matching: {e}", exc_info=True)
         # Continue with candidates found so far

    if response_candidates and response_candidates.data:
        logger.debug(f"Processing {len(response_candidates.data)} candidates for fuzzy matching.")
        anchor_cp = anchor_section.cp_compare
        num_added_fuzzy = 0
        for row in response_candidates.data:
            try:
                candidate_section = InputSection(**row)

                # Avoid processing duplicates if somehow fetched again or already in exact list
                if candidate_section.source_track_id in processed_candidate_source_ids:
                    continue

                # **Filter 1: Check Key Compatibility (Redundant if DB only fetched exact key, but good safeguard)**
                # if not keys_compatible(anchor_section.key, anchor_section.scale, candidate_section.key, candidate_section.scale):
                #    continue # Skip if not key compatible

                # **Filter 2: Check CP Fuzzy Similarity**
                candidate_cp = candidate_section.cp_compare
                if candidate_cp and anchor_cp: # Ensure both exist
                    # Use the numeric part for fuzzy matching
                    num_part_anchor = "".join(filter(str.isdigit, anchor_cp))
                    num_part_candidate = "".join(filter(str.isdigit, candidate_cp))
                    if num_part_anchor and num_part_candidate:
                        similarity = fuzz.ratio(num_part_anchor, num_part_candidate)
                        if similarity >= CP_FUZZY_SIMILARITY_THRESHOLD:
                            # Assign fuzzy score
                            all_candidates_with_scores.append((candidate_section, float(similarity)))
                            processed_candidate_source_ids.add(candidate_section.source_track_id)
                            num_added_fuzzy += 1
                            logger.debug(f"Fuzzy match passed: {candidate_section.hooktheory_section_id} (Key: {candidate_section.key}, Score: {similarity})")

            except Exception as parse_err:
                logger.warning(f"Skipping fuzzy candidate row due to parsing error: {parse_err} - Row: {row}")
        logger.info(f"Added {num_added_fuzzy} candidates via fuzzy matching.")

    # --- Selection Logic ---
    if not all_candidates_with_scores:
        logger.warning("No compatible candidates found after filtering.")
        return []

    logger.info(f"Total compatible candidates found: {len(all_candidates_with_scores)}. Selecting {count} based on temperature {temperature}.")

    # Separate candidates and scores
    population = [item[0] for item in all_candidates_with_scores]
    scores = [item[1] for item in all_candidates_with_scores]

    selected_sections: List[InputSection] = []

    # Handle deterministic case (temp=0 or very close)
    if temperature < EPSILON:
        logger.debug("Temperature near zero. Selecting deterministically based on score.")
        # Sort by score descending
        sorted_candidates = sorted(all_candidates_with_scores, key=lambda x: x[1], reverse=True)
        selected_sections = [item[0] for item in sorted_candidates[:count]]
    else:
        # Weighted random sampling without replacement
        logger.debug("Temperature > 0. Performing weighted random sampling.")
        try:
            # Calculate weights: score^(1/temp) - more emphasis on higher scores for low temp
            weights = [(s + EPSILON)**(1.0 / temperature) for s in scores]
            logger.debug(f"Calculated weights (first 5): {[round(w, 2) for w in weights[:5]]}")

            # Perform weighted sample without replacement
            selected_sections = weighted_sample_without_replacement(population, weights, k=count)

        except (OverflowError, ValueError) as e:
             logger.error(f"Numerical error during weight calculation/sampling (temp={temperature}): {e}. Falling back to deterministic selection.", exc_info=True)
             # Fallback to deterministic if weights explode or other math issues
             sorted_candidates = sorted(all_candidates_with_scores, key=lambda x: x[1], reverse=True)
             selected_sections = [item[0] for item in sorted_candidates[:count]]

    logger.info(f"Selected {len(selected_sections)} sections using temp {temperature}. IDs: {[s.hooktheory_section_id for s in selected_sections]}")
    return selected_sections