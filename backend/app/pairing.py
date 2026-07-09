# backend/app/pairing.py
import random
from typing import List, Dict, Optional, Tuple, Set
import logging
from .schemas import InputSection, InputTrack
from .musictheory_utils import (
    keys_compatible,
    get_section_category,
    chord_progressions_similar,
    get_section_sort_key,
)

logger = logging.getLogger(__name__)

def create_pairings(
    requested_tracks: List[InputTrack],
) -> List[Tuple[InputSection, Optional[InputSection]]]:
    """
    Generates pairings between anchor sections and suggestion sections based on rules.
    """
    logger.info("Creating pairings using rule-based matching...")

    anchor_tracks = [t for t in requested_tracks if t.anchor]
    suggestion_tracks = [t for t in requested_tracks if not t.anchor]

    if not anchor_tracks:
        logger.error("No anchor track found in the request. Cannot create pairings.")
        raise ValueError("Pairing requires at least one anchor track.")

    primary_anchor_track = anchor_tracks[0]
    anchor_sections_ordered = sorted(primary_anchor_track.sections, key=lambda s: s.start_time_s)

    suggestion_sections_pool: List[InputSection] = [
        s for track in suggestion_tracks for s in track.sections
    ]
    # Keep a separate copy to potentially remove used suggestions
    available_suggestions = list(suggestion_sections_pool)

    if not available_suggestions:
        logger.warning("No suggestion tracks/sections available for pairing.")

    logger.info(f"Found {len(anchor_sections_ordered)} anchor sections (ordered).")
    logger.info(f"Found {len(available_suggestions)} suggestion sections in the pool.")

    pairings: List[Tuple[InputSection, Optional[InputSection]]] = []
    # --- Perform Pairing Logic --- (Copied & adapted from previous generate_mashup_timeline Step 2)
    for anchor_section in anchor_sections_ordered:
        # ... (rest of the pairing logic: Rule 1 -> Rule 4 using available_suggestions pool) ...
        # --- Start of copy ---
        logger.debug(f"\n--- Matching for Anchor Section: {anchor_section.title} - {anchor_section.section_name} (ID: {anchor_section.hooktheory_section_id}) ---")

        if not available_suggestions: # Check the modifiable pool
            pairings.append((anchor_section, None))
            logger.debug("No suggestion sections available/left to pair with.")
            continue

        candidate_pool = list(available_suggestions) # Start with available

        # Rule 1: Key Compatibility
        compatible_by_key = [s for s in candidate_pool if keys_compatible(anchor_section.key, anchor_section.scale, s.key, s.scale)]
        logger.debug(f"Rule 1 (Key: {anchor_section.key}): {len(compatible_by_key)} candidates found from {len(candidate_pool)}.")
        if not compatible_by_key:
            pairings.append((anchor_section, None)); continue

        if len(compatible_by_key) == 1:
            chosen = compatible_by_key[0]
            pairings.append((anchor_section, chosen))
            # Decide on reuse: if you remove, suggestion can only be used once
            available_suggestions.remove(chosen)
            continue
        candidate_pool = compatible_by_key

        # Rule 2: Section Category
        anchor_category = get_section_category(anchor_section.section_name)
        compatible_by_section = [s for s in candidate_pool if get_section_category(s.section_name) == anchor_category]
        logger.debug(f"Rule 2 (Section Cat: {anchor_category}): {len(compatible_by_section)} candidates found from {len(candidate_pool)}.")
        if not compatible_by_section:
            chosen = random.choice(candidate_pool) # Fallback to key-compatible
            pairings.append((anchor_section, chosen))
            available_suggestions.remove(chosen) # Optional removal
            continue
        if len(compatible_by_section) == 1:
            chosen = compatible_by_section[0]
            pairings.append((anchor_section, chosen))
            available_suggestions.remove(chosen) # Optional removal
            continue
        candidate_pool = compatible_by_section

        # Rule 3: Chord Progression
        compatible_by_cp = [s for s in candidate_pool if chord_progressions_similar(anchor_section, s)]
        logger.debug(f"Rule 3 (Chord Prog Compare: {anchor_section.cp_compare}): {len(compatible_by_cp)} candidates found from {len(candidate_pool)}.")

        if not compatible_by_cp:
            chosen = random.choice(candidate_pool) # Fallback to section-compatible
            pairings.append((anchor_section, chosen))
            available_suggestions.remove(chosen) # Optional removal
            continue
        if len(compatible_by_cp) == 1:
            chosen = compatible_by_cp[0]
            pairings.append((anchor_section, chosen))
            available_suggestions.remove(chosen) # Optional removal
            continue
        candidate_pool = compatible_by_cp

        # Rule 4: Random Choice
        chosen = random.choice(candidate_pool)
        pairings.append((anchor_section, chosen))
        available_suggestions.remove(chosen) # Optional removal
        # --- End of copy ---

    logger.info(f"Created {len(pairings)} pairings.")
    return pairings