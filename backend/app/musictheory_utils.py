import random
from typing import List, Dict, Optional, Tuple, Set
import logging
from app.schemas import InputSection
from thefuzz import fuzz
import re

logger = logging.getLogger(__name__)

# --- Camelot Wheel Logic ---
# weird notes:
# B# ~ C , E# ~ F , Cb ~ B , Fb ~ E
CAMELOT_MAP = {
    # major Keys (B) 
    "C major": (8, "B"), "G major": (9, "B"), "D major": (10, "B"), "A major": (11, "B"), "E major": (12, "B"), "B major": (1, "B"), "F major": (7, "B"),
        # flats
    "Cb major": (1, "B"), "Gb major": (2, "B"), "Db major": (3, "B"), "Ab major": (4, "B"), "Eb major": (5, "B"), "Bb major": (6, "B"), "Fb major": (12, "B"),
        # sharps
    "C# major": (3, "B"), "G# major": (4, "B"), "D# major": (5, "B"), "A# major": (6, "B"), "E# major": (7, "B"), "B# major": (8, "B"), "F# major": (2, "B"),
    # minor Keys (A)
    "C minor": (5, "A"), "G minor": (6, "A"), "D minor": (7, "A"), "A minor": (8, "A"), "E minor": (9, "A"), "B minor": (10, "A"), "F minor": (4, "A"),
        # flats
    "Cb minor": (10, "A"), "Gb minor": (11, "A"), "Db minor": (12, "A"), "Ab minor": (1, "A"), "Eb minor": (2, "A"), "Bb minor": (3, "A"), "Fb minor": (9, "A"),
        # sharps
    "C# minor": (12, "A"), "G# minor": (1, "A"), "D# minor": (2, "A"), "A# minor": (3, "A"), "E# minor": (4, "A"), "B# minor": (5, "A"), "F# minor": (11, "A"),
    
       # --- Add Modes mapped to their RELATIVE major's Camelot value ---
    # mixolydian (V -> I) - Maps to major key a Perfect 5th *below* (or P4 *above*)
    "Ab mixolydian": (3, "B"),  # Relative major: Db major
    "A mixolydian":  (10, "B"), # Relative major: D major
    "Bb mixolydian": (5, "B"),  # Relative major: Eb major
    "B mixolydian":  (12, "B"), # Relative major: E major
    "C mixolydian":  (7, "B"),  # Relative major: F major
    "C# mixolydian": (2, "B"),  # Relative major: F# major
    "D mixolydian":  (9, "B"),  # Relative major: G major
    "Eb mixolydian": (4, "B"),  # Relative major: Ab major
    "E mixolydian":  (11, "B"), # Relative major: A major
    "F mixolydian":  (6, "B"),  # Relative major: Bb major
    "F# mixolydian": (1, "B"),  # Relative major: B major
    "G mixolydian":  (8, "B"),  # Relative major: C major

    # lydian (IV -> I) - Maps to major key a Perfect 4th *below* (or P5 *above*)
    "Ab lydian": (5, "B"),  # Relative major: Eb major
    "A lydian":  (12, "B"), # Relative major: E major
    "Bb lydian": (7, "B"),  # Relative major: F major
    "B lydian":  (2, "B"),  # Relative major: F# major
    "C lydian":  (9, "B"),  # Relative major: G major
    "Db lydian": (4, "B"),  # Relative major: Ab major
    "D lydian":  (11, "B"), # Relative major: A major
    "Eb lydian": (6, "B"),  # Relative major: Bb major
    "E lydian":  (1, "B"),  # Relative major: B major
    "F lydian":  (8, "B"),  # Relative major: C major
    "Gb lydian": (3, "B"),  # Relative major: Db major
    "G lydian":  (10, "B"), # Relative major: D major

    # dorian (ii -> I) - Maps to major key a major 2nd *below*
    "A dorian":  (9, "B"),  # Relative major: G major
    "Bb dorian": (4, "B"),  # Relative major: Ab major
    "B dorian":  (11, "B"), # Relative major: A major
    "C dorian":  (6, "B"),  # Relative major: Bb major
    "C# dorian": (1, "B"),  # Relative major: B major
    "D dorian":  (8, "B"),  # Relative major: C major
    "Eb dorian": (3, "B"),  # Relative major: Db major
    "E dorian":  (10, "B"), # Relative major: D major
    "F dorian":  (5, "B"),  # Relative major: Eb major
    "F# dorian": (12, "B"), # Relative major: E major
    "G dorian":  (7, "B"),  # Relative major: F major
    "G# dorian": (2, "B"),  # Relative major: F# major

    # phrygian (iii -> I) - Maps to major key a major 3rd *below*
    "A phrygian":  (7, "B"),  # Relative major: F major
    "A# phrygian": (2, "B"),  # Relative major: F# major (A# is enharmonic to Bb, M3 below Bb is Gb=F#)
    "B phrygian":  (9, "B"),  # Relative major: G major
    "C phrygian":  (4, "B"),  # Relative major: Ab major
    "C# phrygian": (11, "B"), # Relative major: A major
    "D phrygian":  (6, "B"),  # Relative major: Bb major
    "D# phrygian": (1, "B"),  # Relative major: B major (D# is enharmonic to Eb, M3 below Eb is Cb=B)
    "E phrygian":  (8, "B"),  # Relative major: C major
    "F phrygian":  (3, "B"),  # Relative major: Db major
    "F# phrygian": (10, "B"), # Relative major: D major
    "G phrygian":  (5, "B"),  # Relative major: Eb major
    "G# phrygian": (12, "B"), # Relative major: E major

    # locrian (vii -> I) - Maps to major key a minor 2nd *below*
    "A locrian":  (6, "B"),  # Relative major: Bb major (A is 7th of Bb)
    "A# locrian": (1, "B"),  # Relative major: B major (A# is 7th of B)
    "B locrian":  (8, "B"),  # Relative major: C major (B is 7th of C)
    "C locrian":  (3, "B"),  # Relative major: Db major (C is 7th of Db)
    "C# locrian": (10, "B"), # Relative major: D major (C# is 7th of D)
    "D locrian":  (5, "B"),  # Relative major: Eb major (D is 7th of Eb)
    "D# locrian": (12, "B"), # Relative major: E major (D# is 7th of E)
    "E locrian":  (7, "B"),  # Relative major: F major (E is 7th of F)
    "E# locrian": (2, "B"), # Relative major: F# major (E# is 7th of F#)
    "F# locrian": (9, "B"),  # Relative major: G major (F# is 7th of G)
    "G locrian":  (4, "B"),  # Relative major: Ab major (G is 7th of Ab)
    "G# locrian": (11, "B"), # Relative major: A major (G# is 7th of A)
}

def get_camelot_number(key: Optional[str], scale: Optional[str]) -> Optional[Tuple[int, str]]:
    """
    Converts a musical key/scale combination (e.g., "C", "major" or "D", "dorian")
    into its Camelot number and type (A/B) using the comprehensive CAMELOT_MAP.
    """
    if not key or not scale:
        return None

    # Normalize key notation (handle flats/sharps consistency)
    normalized_key_root = key.strip().replace("♭", "b").replace("♯", "#")
    # Ensure first letter is capitalized if it's not flat/sharp
    if len(normalized_key_root) > 0 and normalized_key_root[0].islower():
         normalized_key_root = normalized_key_root[0].upper() + normalized_key_root[1:]

    # Construct the lookup key string
    scale_cleaned = scale.lower().strip()
    if scale_cleaned is "harmonicminor":           #  IMPORTANT: assumed harmonic minor == minor 
        scale_cleaned = "minor"
    lookup_key_str = f"{normalized_key_root} {scale_cleaned}"

    camelot_value = CAMELOT_MAP.get(lookup_key_str)
    if not camelot_value:
         logger.warning(f"Key/Scale combination '{lookup_key_str}' not found in CAMELOT_MAP.")
         # Fallback: Try just the major/minor equivalent if the mode lookup failed?
         # This adds complexity, let's rely on the map being comprehensive for now.
         return None

    logger.debug(f"Mapped '{lookup_key_str}' to Camelot: {camelot_value}")
    return camelot_value

def get_camelot_neighbors(camelot_num: int, key_type: str) -> Set[Tuple[int, str]]:
    """Calculates valid Camelot neighbors."""
    neighbors = set()
    # +/- 1 (wrapping 12 and 1)
    neighbors.add(((camelot_num - 1 - 1 + 12) % 12 + 1, key_type)) # Previous number
    neighbors.add(((camelot_num - 1 + 1) % 12 + 1, key_type))      # Next number
    # +/- 7 (Mode Mixture - less common but sometimes used) - Optional
    neighbors.add(((camelot_num - 1 + 7) % 12 + 1, key_type))
    # neighbors.add(((camelot_num - 1 - 7 + 12) % 12 + 1, key_type))
    # Same number, different type (relative major/minor)
    other_type = "B" if key_type == "A" else "A"
    neighbors.add((camelot_num, other_type))
    return neighbors

def keys_compatible(key1: Optional[str], scale1: Optional[str], key2: Optional[str], scale2: Optional[str]) -> bool:
    """
    Checks if two key/scale combinations are compatible based on the Camelot wheel,
    after normalizing modes to their parallel major/minor counterparts.
    """
    if not key1 or not scale1 or not key2 or not scale2:
        logger.debug("Cannot compare keys: Missing key or scale for one or both sections.")
        return False # Cannot compare if info is missing

    camelot1 = get_camelot_number(key1, scale1)
    camelot2 = get_camelot_number(key2, scale2)

    if not camelot1 or not camelot2:
        logger.warning(f"Could not determine Camelot number for '{key1} {scale1}' ({camelot1}) or '{key2} {scale2}' ({camelot2}). Treating as incompatible.")
        return False # Cannot compare if Camelot conversion fails

    num1, type1 = camelot1
    num2, type2 = camelot2

    # Check if they are identical
    if camelot1 == camelot2:
        logger.debug(f"Keys compatible (identical Camelot value): {camelot1}")
        return True

    # Check if key2 is a neighbor of key1 on Camelot wheel
    neighbors1 = get_camelot_neighbors(num1, type1)
    is_neighbor = camelot2 in neighbors1
    logger.debug(f"Comparing Camelot: {key1} {scale1} ({camelot1}) vs {key2} {scale2} ({camelot2}). Neighbors of {camelot1}: {neighbors1}. Compatible: {is_neighbor}")
    return is_neighbor


# --- Section Category Logic ---

SECTION_MAPPING = {
    'Bridge' : 'Misc', 'Chorus' : 'Drop', 'Chorus 2' : 'Drop',
    'Chorus 3' : 'Drop', 'Chorus Lead-Out' : 'Drop', 'Instrumental' : 'Drop',
    'Intro' : 'Misc', 'Intro and Verse' : 'Misc', 'Outro' : 'Misc',
    'Outro 2' : 'Misc', 'Pre-Chorus' : 'Build-Up', 'Pre-Chorus and Chorus' : 'Drop',
    'Pre-Outro' : 'Misc', 'Solo' : 'Drop', 'Solo 1' : 'Drop',
    'Solo 2' : 'Drop', 'Verse' : 'Build-Up', 'Verse and Pre-Chorus' : 'Build-Up',
    # Add more mappings as needed, handle variations
    'Verse 1': 'Build-Up', 'Verse 2': 'Build-Up', 'Verse 3': 'Build-Up',
    'Post-Chorus': 'Drop', # Common section type
}
DEFAULT_CATEGORY = 'Misc'

def get_section_category(section_name: Optional[str]) -> str:
    """Maps a raw section name to a broader category."""
    if not section_name:
        return DEFAULT_CATEGORY
    # Basic normalization
    normalized_name = section_name.strip()
    return SECTION_MAPPING.get(normalized_name, DEFAULT_CATEGORY)


# --- Constants for Chord Similarity ---
# Threshold for fuzzy matching (0-100 scale). Higher = stricter.
CP_FUZZY_SIMILARITY_THRESHOLD = 85
# Minimum length for substring matching to be considered meaningful
CP_SUBSTRING_MIN_LEN = 3 # Adjusted slightly lower, e.g., "156" vs "4156"

# ... (keep keys_compatible, get_section_category, get_section_sort_key) ...

# --- Chord Progression Logic ---

def chord_progressions_similar(section1: InputSection, section2: InputSection) -> bool:
    """
    Compares two sections based on their pre-computed 'cp_compare' strings
    (generated using parse_cp_allow_double_repeats logic).
    Both are text (string) representations of the chord progressions in number form- i.e, 1564 or 11 or 2.

    Uses multiple levels of matching:
    1. Exact match.
    2. Subset match (checking if one is contained in the other, min length applies).
    3. Fuzzy match (Levenshtein distance ratio > threshold).
    """
    cp_num1 = section1.cp_compare
    cp_num2 = section2.cp_compare

     # --- Level 0: Basic Check ---
    if not cp_num1 or not cp_num2:
        logger.debug(f"Cannot compare CPs: cp_compare missing for {section1.hooktheory_section_id} or {section2.hooktheory_section_id}")
        return False

    # --- Level 1: Exact Numeric Match ---
    if cp_num1 == cp_num2:
        logger.debug(f"CPs match (Exact Numeric): '{cp_num1}'")
        return True

    # --- Level 1.5: Exact Chord Name Match ---
    chord_names1 = get_chord_names_from_cp_compare(cp_num1, section1.key, section1.scale)
    chord_names2 = get_chord_names_from_cp_compare(cp_num2, section2.key, section2.scale)

    # Only proceed if both conversions were successful
    if chord_names1 is not None and chord_names2 is not None:
        if chord_names1 == chord_names2:
            logger.debug(f"CPs match (Exact Chord Names): {chord_names1}")
            return True
        else:
            logger.debug(f"Chord names differ: {chord_names1} vs {chord_names2}")
    else:
        logger.debug("Could not compare exact chord names (conversion failed for one or both).")


    # --- Level 2: Numeric Subset Match ---
    len1, len2 = len(cp_num1), len(cp_num2)
    # Check if one is a substring of the other (and meets min length)
    if len1 >= CP_SUBSTRING_MIN_LEN and len2 >= CP_SUBSTRING_MIN_LEN:
        # Use stripped numeric parts for subset check to avoid non-digit issues
        num_part1 = "".join(re.findall(r'\d', cp_num1))
        num_part2 = "".join(re.findall(r'\d', cp_num2))
        if num_part1 and num_part2 and (num_part1 in num_part2 or num_part2 in num_part1):
             logger.debug(f"CPs match (Numeric Subset): '{num_part1}' within '{num_part2}' or vice versa")
             return True

    # --- Level 3: Numeric Fuzzy Match ---
    # Use fuzz.ratio for overall similarity based on Levenshtein distance
    # Compare numeric parts only for better fuzzy accuracy
    num_part1 = "".join(re.findall(r'\d', cp_num1))
    num_part2 = "".join(re.findall(r'\d', cp_num2))
    if num_part1 and num_part2: # Ensure we have numeric parts to compare
        similarity = fuzz.ratio(num_part1, num_part2)
        if similarity >= CP_FUZZY_SIMILARITY_THRESHOLD:
            logger.debug(f"CPs match (Numeric Fuzzy): '{num_part1}' vs '{num_part2}' (Similarity: {similarity} >= {CP_FUZZY_SIMILARITY_THRESHOLD})")
            return True
    else: # Handle case where one/both cp_compare strings have no digits
         similarity = 0 # Cannot compare fuzzily

    # If none of the above match
    logger.debug(f"CPs do not match sufficiently: Num='{cp_num1}' vs '{cp_num2}' (Fuzzy Sim: {similarity if 'similarity' in locals() else 'N/A'})")
    return False


# --- Section Ordering ---
SECTION_ORDER = [
    'Intro', 'Intro and Verse', # Group Intros
    'Verse', 'Verse 1', 'Verse 2', 'Verse 3', 'Verse and Pre-Chorus', # Group Verses
    'Pre-Chorus', # Group Pre-Choruses
    'Chorus', 'Chorus 1', 'Chorus 2', 'Chorus 3', 'Pre-Chorus and Chorus', 'Chorus Lead-Out', 'Post-Chorus', # Group Choruses
    'Bridge', # Group Bridges
    'Solo', 'Solo 1', 'Solo 2', 'Instrumental', # Group Solos/Instrumentals
    'Outro', 'Outro 2', 'Pre-Outro' # Group Outros
]
SECTION_ORDER_MAP = {name: i for i, name in enumerate(SECTION_ORDER)}
DEFAULT_ORDER = len(SECTION_ORDER)

def get_section_sort_key(section: InputSection) -> int:
    """Provides a sort key for ordering sections canonically."""
    name = section.section_name.strip() if section.section_name else ''
    return SECTION_ORDER_MAP.get(name, DEFAULT_ORDER)


def get_chord_names_from_cp_compare(
    cp_compare_str: Optional[str],
    key: Optional[str],
    scale: Optional[str]
) -> Optional[List[str]]:
    """
    Converts a numeric cp_compare string (e.g., "1564") into a list of
    actual chord names (e.g., ["C", "G", "Am", "F"]) based on the section's key and scale.
    Returns None if conversion is not possible.
    """
    if not cp_compare_str or not key or not scale:
        logger.debug("Cannot get chord names: Missing cp_compare, key, or scale.")
        return None

    # Normalize key (handle flats/sharps consistency if needed, though your dict uses both)
    # Normalize scale
    normalized_scale = scale.lower().strip()
    lookup_key = (key, normalized_scale)

    if lookup_key not in key_chord_lookup:
        logger.warning(f"Key/Scale combination '{key} {normalized_scale}' not found in key_chord_lookup.")
        return None

    scale_chords = key_chord_lookup[lookup_key]
    chord_names = []

    # Extract digits from the string (handle non-digit chars if necessary)
    numeric_part = re.findall(r'\d', cp_compare_str)
    if not numeric_part:
        logger.warning(f"Could not extract numeric digits from cp_compare: '{cp_compare_str}'")
        return None

    for digit_char in numeric_part:
        try:
            chord_num = int(digit_char)
            if 1 <= chord_num <= 7:
                chord_name = scale_chords.get(chord_num)
                if chord_name:
                    chord_names.append(chord_name)
                else:
                    logger.warning(f"Chord number {chord_num} not found for key/scale {lookup_key}. Skipping.")
            else:
                logger.warning(f"Invalid chord number '{chord_num}' in cp_compare string '{cp_compare_str}'. Skipping.")
        except ValueError:
            logger.warning(f"Could not parse digit '{digit_char}' in cp_compare string '{cp_compare_str}'. Skipping.")
            continue # Skip non-integer characters if any slip through regex

    if not chord_names:
        logger.debug(f"No valid chord names generated for cp_compare '{cp_compare_str}' in {lookup_key}.")
        return None

    logger.debug(f"Generated chord names for {lookup_key}, cp='{cp_compare_str}': {chord_names}")
    return chord_names


key_chord_lookup = {('Ab', 'major'): {1: 'A♭', 2: 'B♭', 3: 'C', 4: 'D♭', 5: 'E♭', 6: 'F', 7: 'G'}, 
                    ('A', 'major'): {1: 'A', 2: 'B', 3: 'C#', 4: 'D', 5: 'E', 6: 'F#', 7: 'G#'}, 
                    ('Bb', 'major'): {1: 'B♭', 2: 'C', 3: 'D', 4: 'E♭', 5: 'F', 6: 'G', 7: 'A'},
                    ('B', 'major'): {1: 'B', 2: 'C#', 3: 'D#', 4: 'E', 5: 'F#', 6: 'G#', 7: 'A#'}, 
                    ('C', 'major'): {1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G', 6: 'A', 7: 'B'}, 
                    ('Db', 'major'): {1: 'D♭', 2: 'E♭', 3: 'F', 4: 'G♭', 5: 'A♭', 6: 'B♭', 7: 'C'},
                    ('D', 'major'): {1: 'D', 2: 'E', 3: 'F#', 4: 'G', 5: 'A', 6: 'B', 7: 'C#'}, 
                    ('Eb', 'major'): {1: 'E♭', 2: 'F', 3: 'G', 4: 'A♭', 5: 'B♭', 6: 'C', 7: 'D'}, 
                    ('E', 'major'): {1: 'E', 2: 'F#', 3: 'G#', 4: 'A', 5: 'B', 6: 'C#', 7: 'D#'}, 
                    ('F', 'major'): {1: 'F', 2: 'G', 3: 'A', 4: 'B♭', 5: 'C', 6: 'D', 7: 'E'}, 
                    ('F#', 'major'): {1: 'F#', 2: 'G#', 3: 'A#', 4: 'B', 5: 'C#', 6: 'D#', 7: 'E#'}, 
                    ('G', 'major'): {1: 'G', 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F#'}, 
                    ('A', 'minor'): {1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G'}, 
                    ('Bb', 'minor'): {1: 'B♭', 2: 'C', 3: 'D♭', 4: 'E♭', 5: 'F', 6: 'G♭', 7: 'A♭'},
                    ('B', 'minor'): {1: 'B', 2: 'C#', 3: 'D', 4: 'E', 5: 'F#', 6: 'G', 7: 'A'}, 
                    ('C', 'minor'): {1: 'C', 2: 'D', 3: 'E♭', 4: 'F', 5: 'G', 6: 'A♭', 7: 'B♭'}, 
                    ('C#', 'minor'): {1: 'C#', 2: 'D#', 3: 'E', 4: 'F#', 5: 'G#', 6: 'A', 7: 'B'}, 
                    ('D', 'minor'): {1: 'D', 2: 'E', 3: 'F', 4: 'G', 5: 'A', 6: 'B♭', 7: 'C'}, 
                    ('D#', 'minor'): {1: 'D#', 2: 'E#', 3: 'F#', 4: 'G#', 5: 'A#', 6: 'B', 7: 'C#'}, 
                    ('E', 'minor'): {1: 'E', 2: 'F#', 3: 'G', 4: 'A', 5: 'B', 6: 'C', 7: 'D'}, 
                    ('F', 'minor'): {1: 'F', 2: 'G', 3: 'A♭', 4: 'B♭', 5: 'C', 6: 'D♭', 7: 'E♭'}, 
                    ('F#', 'minor'): {1: 'F#', 2: 'G#', 3: 'A', 4: 'B', 5: 'C#', 6: 'D', 7: 'E'}, 
                    ('G', 'minor'): {1: 'G', 2: 'A', 3: 'B♭', 4: 'C', 5: 'D', 6: 'E♭', 7: 'F'}, 
                    ('G#', 'minor'): {1: 'G#', 2: 'A#', 3: 'B', 4: 'C#', 5: 'D#', 6: 'E', 7: 'F#'}, 
                    ('Ab', 'mixolydian'): {1: 'A♭', 2: 'B♭', 3: 'C', 4: 'D♭', 5: 'E♭', 6: 'F♭', 7: 'G♭'},
                    ('A', 'mixolydian'): {1: 'A', 2: 'B', 3: 'C#', 4: 'D', 5: 'E', 6: 'F#', 7: 'G'}, 
                    ('Bb', 'mixolydian'): {1: 'B♭', 2: 'C', 3: 'D', 4: 'E♭', 5: 'F', 6: 'G♭', 7: 'A♭'},
                    ('B', 'mixolydian'): {1: 'B', 2: 'C#', 3: 'D#', 4: 'E', 5: 'F#', 6: 'G#', 7: 'A'}, 
                    ('C', 'mixolydian'): {1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G', 6: 'A', 7: 'B♭'}, 
                    ('C#', 'mixolydian'): {1: 'C#', 2: 'D#', 3: 'E#', 4: 'F#', 5: 'G#', 6: 'A#', 7: 'B'}, 
                    ('D', 'mixolydian'): {1: 'D', 2: 'E', 3: 'F#', 4: 'G', 5: 'A', 6: 'B', 7: 'C'}, 
                    ('Eb', 'mixolydian'): {1: 'E♭', 2: 'F', 3: 'G', 4: 'A♭', 5: 'B♭', 6: 'C♭', 7: 'D♭'},
                    ('E', 'mixolydian'): {1: 'E', 2: 'F#', 3: 'G#', 4: 'A', 5: 'B', 6: 'C#', 7: 'D'}, 
                    ('F', 'mixolydian'): {1: 'F', 2: 'G', 3: 'A', 4: 'B♭', 5: 'C', 6: 'D', 7: 'E♭'}, 
                    ('F#', 'mixolydian'): {1: 'F#', 2: 'G#', 3: 'A#', 4: 'B', 5: 'C#', 6: 'D#', 7: 'E'}, 
                    ('G', 'mixolydian'): {1: 'G', 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F'}, 
                    ('A', 'dorian'): {1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F#', 7: 'G'}, 
                    ('Bb', 'dorian'): {1: 'B♭', 2: 'C', 3: 'D♭', 4: 'E♭', 5: 'F', 6: 'G', 7: 'A♭'},
                    ('B', 'dorian'): {1: 'B', 2: 'C#', 3: 'D', 4: 'E', 5: 'F#', 6: 'G#', 7: 'A'}, 
                    ('C', 'dorian'): {1: 'C', 2: 'D', 3: 'E♭', 4: 'F', 5: 'G', 6: 'A', 7: 'B♭'}, 
                    ('C#', 'dorian'): {1: 'C#', 2: 'D#', 3: 'E', 4: 'F#', 5: 'G#', 6: 'A#', 7: 'B'}, 
                    ('D', 'dorian'): {1: 'D', 2: 'E', 3: 'F', 4: 'G', 5: 'A', 6: 'B', 7: 'C'}, 
                    ('Eb', 'dorian'): {1: 'E♭', 2: 'F', 3: 'G♭', 4: 'A♭', 5: 'B♭', 6: 'C', 7: 'D♭'}, 
                    ('E', 'dorian'): {1: 'E', 2: 'F#', 3: 'G', 4: 'A', 5: 'B', 6: 'C#', 7: 'D'}, 
                    ('F', 'dorian'): {1: 'F', 2: 'G', 3: 'A♭', 4: 'B♭', 5: 'C', 6: 'D', 7: 'E♭'}, 
                    ('F#', 'dorian'): {1: 'F#', 2: 'G#', 3: 'A', 4: 'B', 5: 'C#', 6: 'D#', 7: 'E'}, 
                    ('G', 'dorian'): {1: 'G', 2: 'A', 3: 'B♭', 4: 'C', 5: 'D', 6: 'E', 7: 'F'}, 
                    ('G#', 'dorian'): {1: 'G#', 2: 'A#', 3: 'B', 4: 'C#', 5: 'D#', 6: 'E#', 7: 'F#'}, 
                    ('A', 'phrygian'): {1: 'A', 2: 'B♭', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G'}, 
                    ('A#', 'phrygian'): {1: 'A#', 2: 'B', 3: 'C#', 4: 'D#', 5: 'E#', 6: 'F#', 7: 'G#'}, 
                    ('B', 'phrygian'): {1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F#', 6: 'G', 7: 'A'}, 
                    ('C', 'phrygian'): {1: 'C', 2: 'D♭', 3: 'E♭', 4: 'F', 5: 'G', 6: 'A♭', 7: 'B♭'}, 
                    ('C#', 'phrygian'): {1: 'C#', 2: 'D', 3: 'E', 4: 'F#', 5: 'G#', 6: 'A', 7: 'B'}, 
                    ('D', 'phrygian'): {1: 'D', 2: 'E♭', 3: 'F', 4: 'G', 5: 'A', 6: 'B♭', 7: 'C'}, 
                    ('D#', 'phrygian'): {1: 'D#', 2: 'E', 3: 'F#', 4: 'G#', 5: 'A#', 6: 'B', 7: 'C#'}, 
                    ('E', 'phrygian'): {1: 'E', 2: 'F', 3: 'G', 4: 'A', 5: 'B', 6: 'C', 7: 'D'}, 
                    ('F', 'phrygian'): {1: 'F', 2: 'G♭', 3: 'A♭', 4: 'B♭', 5: 'C', 6: 'D♭', 7: 'E♭'}, 
                    ('F#', 'phrygian'): {1: 'F#', 2: 'G', 3: 'A', 4: 'B', 5: 'C#', 6: 'D', 7: 'E'}, 
                    ('G', 'phrygian'): {1: 'G', 2: 'A♭', 3: 'B♭', 4: 'C', 5: 'D', 6: 'E♭', 7: 'F'}, 
                    ('G#', 'phrygian'): {1: 'G#', 2: 'A', 3: 'B', 4: 'C#', 5: 'D#', 6: 'E', 7: 'F#'}, 
                    ('Ab', 'lydian'): {1: 'A♭', 2: 'B♭', 3: 'C', 4: 'D', 5: 'E♭', 6: 'F', 7: 'G'}, 
                    ('A', 'lydian'): {1: 'A', 2: 'B', 3: 'C#', 4: 'D#', 5: 'E', 6: 'F#', 7: 'G#'}, 
                    ('Bb', 'lydian'): {1: 'B♭', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'A'}, 
                    ('B', 'lydian'): {1: 'B', 2: 'C#', 3: 'D#', 4: 'E#', 5: 'F#', 6: 'G#', 7: 'A#'}, 
                    ('C', 'lydian'): {1: 'C', 2: 'D', 3: 'E', 4: 'F#', 5: 'G', 6: 'A', 7: 'B'}, 
                    ('Db', 'lydian'): {1: 'D♭', 2: 'E♭', 3: 'F', 4: 'G', 5: 'A♭', 6: 'B♭', 7: 'C'}, 
                    ('D', 'lydian'): {1: 'D', 2: 'E', 3: 'F#', 4: 'G#', 5: 'A', 6: 'B', 7: 'C#'}, 
                    ('Eb', 'lydian'): {1: 'E♭', 2: 'F', 3: 'G', 4: 'A', 5: 'B♭', 6: 'C', 7: 'D'}, 
                    ('E', 'lydian'): {1: 'E', 2: 'F#', 3: 'G#', 4: 'A#', 5: 'B', 6: 'C#', 7: 'D#'}, 
                    ('F', 'lydian'): {1: 'F', 2: 'G', 3: 'A', 4: 'B', 5: 'C', 6: 'D', 7: 'E'}, 
                    ('Gb', 'lydian'): {1: 'G♭', 2: 'A♭', 3: 'B♭', 4: 'C', 5: 'D♭', 6: 'E♭', 7: 'F'}, 
                    ('G', 'lydian'): {1: 'G', 2: 'A', 3: 'B', 4: 'C#', 5: 'D', 6: 'E', 7: 'F#'}, 
                    ('A', 'locrian'): {1: 'A', 2: 'B♭', 3: 'C', 4: 'D', 5: 'E♭', 6: 'F', 7: 'G'}, 
                    ('A#', 'locrian'): {1: 'A#', 2: 'B', 3: 'C#', 4: 'D#', 5: 'E', 6: 'F#', 7: 'G#'}, 
                    ('B', 'locrian'): {1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'A'}, 
                    ('C', 'locrian'): {1: 'C', 2: 'D♭', 3: 'E♭', 4: 'F', 5: 'G♭', 6: 'A♭', 7: 'B♭'}, 
                    ('C#', 'locrian'): {1: 'C#', 2: 'D', 3: 'E', 4: 'F#', 5: 'G', 6: 'A', 7: 'B'}, 
                    ('D', 'locrian'): {1: 'D', 2: 'E♭', 3: 'F', 4: 'G', 5: 'A♭', 6: 'B♭', 7: 'C'}, 
                    ('D#', 'locrian'): {1: 'D#', 2: 'E', 3: 'F#', 4: 'G#', 5: 'A', 6: 'B', 7: 'C#'}, 
                    ('E', 'locrian'): {1: 'E', 2: 'F', 3: 'G', 4: 'A', 5: 'B♭', 6: 'C', 7: 'D'}, 
                    ('E#', 'locrian'): {1: 'E#', 2: 'F#', 3: 'G#', 4: 'A#', 5: 'B', 6: 'C#', 7: 'D#'}, 
                    ('F#', 'locrian'): {1: 'F#', 2: 'G', 3: 'A', 4: 'B', 5: 'C', 6: 'D', 7: 'E'}, 
                    ('G', 'locrian'): {1: 'G', 2: 'A♭', 3: 'B♭', 4: 'C', 5: 'D♭', 6: 'E♭', 7: 'F'}, 
                    ('G#', 'locrian'): {1: 'G#', 2: 'A', 3: 'B', 4: 'C#', 5: 'D', 6: 'E', 7: 'F#'}}
