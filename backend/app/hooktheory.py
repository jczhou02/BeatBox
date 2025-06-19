import json
import math
from typing import List, Dict, Optional, Tuple, Any, Union, Set
from app.schemas import InputSection, InputTrack
from app.musictheory_utils import get_section_category, get_section_sort_key
import logging

logger = logging.getLogger(__name__)
# --- Constants ---
# Threshold for detecting a significant gap between consecutive anchor sections (in seconds)
# If the gap is larger than this, we preserve it in the timeline.
SECTION_GAP_THRESHOLD = 2.0
# Threshold for detecting a rest/break in melody for vocal clip cutting (in beats)
VOCAL_BREAKING_POINT_THRESHOLD = 1.0 # Adjust as needed (1.0 = a full beat of silence)
# Threshold for identifying a "long" note in suggestion vocal for cutting (in beats) or overlapping anchor melody back in just if we need to cut overly long suggestion vocal that bleeds into the next "drop" section
SUGGESTION_LONG_NOTE_CUT_THRESHOLD_BEATS = 1.5
# Small tolerance for floating point comparisons

# If the gap after a suggestion vocal is longer than this (in seconds),
# try to fill it with the anchor's own vocal.
VOCAL_GAP_FALLBACK_THRESHOLD = 2.0

FLOAT_TOLERANCE = 0.001


# --- Time Conversion ---

def beats_to_seconds(beats: float, bpm: Optional[float], time_sig_numerator: int = 4) -> Optional[float]:
    """Converts a beat count to seconds, given BPM. Assumes quarter note gets the beat."""
    if bpm is None or bpm <= 0:
        logger.warning("Cannot convert beats to seconds: Invalid BPM provided.")
        return None
    # seconds_per_beat = 60.0 / bpm
    # For now, assume quarter note beat, common in pop. Time sig affects measure length, not beat duration here.
    return (beats * 60.0) / bpm

def seconds_to_beats(seconds: float, bpm: Optional[float]) -> Optional[float]:
    """Converts seconds to beats (assumes quarter note gets the beat)."""
    if bpm is None or bpm <= 0: return None
    if seconds < 0: return 0 # Cannot have negative beats
    return (seconds * bpm) / 60.0

# def parse_time_signature(meter: Optional[str]) -> int:
#     """Extracts the numerator from a time signature string (e.g., "4/4" -> 4)."""
#     if not meter or '/' not in meter:
#         return 4 # Default to 4/4
#     try:
#         num_str = meter.split('/')[0].strip()
#         return int(num_str)
#     except (ValueError, IndexError):
#         logger.warning(f"Could not parse time signature numerator from '{meter}'. Defaulting to 4.")
#         return 4

# --- Melody/Chord Data Parsing ---

class Note:
    """Represents a normalized melody note or chord event."""
    def __init__(self, data: Dict[str, Any]):
        beat_val = data.get('beat', data.get('start_beat_abs'))
        # logger.debug(f"Note Init - Raw Beat Input: {beat_val} (type: {type(beat_val)}) from data: {data}") # Temporary log
        self.beat: Optional[float] = self._parse_float(beat_val)
        # logger.debug(f"Note Init - Parsed Beat: {self.beat}") # Temporary log
        self.duration: Optional[float] = self._parse_float(data.get('duration', data.get('note_length', data.get('chord_duration'))))
        # Handle 'isRest' variations (string '0'/'1' vs boolean)
        is_rest_val = data.get('isRest', data.get('isRest'))
        self.is_rest: bool = str(is_rest_val).lower() in ['true', '1'] if is_rest_val is not None else False
        self.scale_degree: Optional[str] = str(data.get('sd', data.get('scale_degree', data.get('root')))) # Normalize root/sd
        # Add other fields if needed (octave, etc.)

    def _parse_float(self, value: Any) -> Optional[float]:
        if value is None: return None
        try:
            return float(value)
        except (ValueError, TypeError):
            logger.warning(f"Could not parse value '{value}' as float.")
            return None

    @property
    def end_beat(self) -> Optional[float]:
        if self.beat is not None and self.duration is not None:
            return self.beat + self.duration
        return None

def parse_melody_or_cp_data(data: Optional[Union[str, List[Dict[str, Any]]]]) -> List[Note]:
    """Parses melody or chord progression data (JSON string or list) into a list of Note objects."""
    if not data:
        return []
    parsed_data: List[Dict[str, Any]] = []
    if isinstance(data, str):
        try:
            parsed_data = json.loads(data)
            if not isinstance(parsed_data, list):
                 logger.warning(f"Parsed data is not a list: {type(parsed_data)}")
                 return []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse melody/cp JSON string: {data[:100]}...")
            return []
    elif isinstance(data, list):
        parsed_data = data
    else:
        logger.warning(f"Unexpected data type for melody/cp: {type(data)}")
        return []

    notes = []
    for entry in parsed_data:
         if isinstance(entry, dict):
             note = Note(entry)
             # Only add if essential timing info is present
             if note.beat is not None and note.duration is not None:
                 notes.append(note)
         else:
              logger.warning(f"Skipping non-dict item in melody/cp data: {entry}")

    # Sort by beat just in case the source isn't ordered
    # notes.sort(key=lambda n: n.beat or float('inf'))
    return notes

# --- Vocal Breaking Point Logic ---

def find_vocal_chunks(melody_notes: List[Note], threshold: float = VOCAL_BREAKING_POINT_THRESHOLD) -> List[Tuple[float, float]]:
    """
    Identifies continuous chunks of vocal activity based on gaps between notes.
    Returns a list of tuples, where each tuple is (start_beat, end_beat) of a chunk.
    """
    chunks = []
    if not melody_notes:
        return chunks

    current_chunk_start: Optional[float] = None
    current_chunk_end: Optional[float] = None

    for i, note in enumerate(melody_notes):
        if note.is_rest or note.beat is None or note.end_beat is None:
            continue # Skip rests or notes with invalid timing

        if current_chunk_start is None:
            # Start of a new potential chunk
            current_chunk_start = note.beat
            current_chunk_end = note.end_beat
        else:
            # Check gap between previous note's end and current note's start
            gap = note.beat - current_chunk_end # Use end of *last note in current chunk*

            if gap >= threshold:
                # Found a significant gap, end the previous chunk
                chunks.append((current_chunk_start, current_chunk_end))
                # Start a new chunk with the current note
                current_chunk_start = note.beat
                current_chunk_end = note.end_beat
            else:
                # No significant gap, extend the current chunk
                current_chunk_end = max(current_chunk_end, note.end_beat) # Extend to the end of the current note

    # Add the last chunk if one was in progress
    if current_chunk_start is not None and current_chunk_end is not None:
        chunks.append((current_chunk_start, current_chunk_end))

    logger.debug(f"Found {len(chunks)} vocal chunks: {chunks}")
    return chunks


def find_suggestion_cut_beat(
    suggestion_notes: List[Note],
    suggestion_bpm: float,
    chunk_start_beat: float, # The effective start beat of the chunk being used
    target_cut_project_time_rel: float, # Max allowed duration in project seconds (relative to suggestion vocal start time)
    vocal_playback_rate: float
) -> Optional[float]:
    """
    Finds a suitable cut beat within the suggestion vocal chunk when bleed is disallowed.
    Searches backwards from the target cut time for a long note's end.
    Falls back to the end of the last note before the target cut time.

    Args:
        suggestion_notes: Parsed melody notes for the suggestion track.
        suggestion_bpm: BPM of the suggestion track.
        chunk_start_beat: The source beat where the vocal chunk effectively started playing.
        target_cut_project_time_rel: The maximum allowed project time duration for this clip.
        vocal_playback_rate: Playback rate of the suggestion vocal clip.

    Returns:
        The suggestion source beat where the clip should end, or None if error.
    """
    if not suggestion_notes or suggestion_bpm <= 0: return None

    # 1. Calculate the target cut point in suggestion SOURCE beats
    max_source_duration_s = target_cut_project_time_rel * vocal_playback_rate
    target_cut_source_time_s = beats_to_seconds(chunk_start_beat, suggestion_bpm) + max_source_duration_s
    target_cut_source_beat = seconds_to_beats(target_cut_source_time_s, suggestion_bpm)

    if target_cut_source_beat is None:
        logger.warning("Could not calculate target cut beat in suggestion source.")
        return None

    logger.debug(f"Target suggestion cut beat (source): {target_cut_source_beat:.2f}")

    # 2. Search backwards for a "long" note ending at or before the target cut beat
    found_long_note_end_beat = None
    for note in reversed(suggestion_notes):
        if note.is_rest or note.beat is None or note.duration is None or note.end_beat is None:
            continue
        # Only consider notes within the relevant chunk (approx) and before the cut point
        if note.beat >= chunk_start_beat and note.end_beat <= (target_cut_source_beat + FLOAT_TOLERANCE):
            if note.duration >= SUGGESTION_LONG_NOTE_CUT_THRESHOLD_BEATS:
                found_long_note_end_beat = note.end_beat
                logger.info(f"Found long suggestion note (duration {note.duration:.2f}) ending at beat {found_long_note_end_beat:.2f} for cut.")
                break # Found the first long one searching backwards

    # 3. Fallback: If no long note found, find the end beat of the last note before the target cut beat
    if found_long_note_end_beat is not None:
        return found_long_note_end_beat
    else:
        logger.debug("No suitable long suggestion note found. Using fallback: end of last note before target cut.")
        last_note_end_beat_fallback = None
        for note in reversed(suggestion_notes):
             if note.is_rest or note.beat is None or note.end_beat is None: continue
             if note.beat >= chunk_start_beat and note.end_beat <= (target_cut_source_beat + FLOAT_TOLERANCE):
                 # Keep track of the latest end_beat found that meets the criteria
                 if last_note_end_beat_fallback is None or note.end_beat > last_note_end_beat_fallback:
                     last_note_end_beat_fallback = note.end_beat

        if last_note_end_beat_fallback is not None:
            logger.info(f"Fallback cut point: End of note at suggestion beat {last_note_end_beat_fallback:.2f}")
            return last_note_end_beat_fallback
        else:
            # Extremely unlikely case: no notes found before cut point within chunk?
            # Default to cutting at the original chunk_start_beat (duration 0)
            logger.warning(f"Fallback failed: No suggestion notes found before target cut beat {target_cut_source_beat:.2f}. Using chunk start {chunk_start_beat:.2f}.")
            return chunk_start_beat


def find_anchor_transition_start_info(
    anchor_notes: List[Note],
    anchor_bpm: float,
    anchor_section_start_s: float, # Absolute start time of the anchor section in source
    anchor_playback_rate: float,
    transition_project_time: float, # Absolute project time where suggestion vocal ends
    section_project_start_time: float # Absolute project time where anchor section starts
) -> Optional[Tuple[float, float, float]]:
    """
    Finds the appropriate start beat and corresponding source/project times for the anchor vocal transition.

    Args:
        anchor_notes: Parsed melody notes for the anchor track.
        anchor_bpm: BPM of the anchor track.
        anchor_section_start_s: Source start time (seconds) of the anchor section.
        anchor_playback_rate: Playback rate of the anchor clip.
        transition_project_time: The absolute project time when the transition should occur.
        section_project_start_time: Absolute project start time of the anchor section.

    Returns:
        Tuple of (anchor_start_beat, anchor_source_start_time, anchor_project_start_time) or None.
        The beat/times represent the beginning of the note/rest where the transition occurs.
    """
    if not anchor_notes or anchor_bpm <= 0: return None

    # 1. Calculate the target transition time relative to the section's start in project time
    transition_project_time_rel = transition_project_time - section_project_start_time

    # 2. Convert this relative project time to the equivalent anchor SOURCE beat offset
    # (relative time in proj -> relative time in source -> relative beat in source)
    transition_source_time_rel_s = transition_project_time_rel * anchor_playback_rate
    target_anchor_beat = seconds_to_beats(transition_source_time_rel_s, anchor_bpm)

    if target_anchor_beat is None:
        logger.warning("Could not calculate target anchor beat for transition.")
        return None

    logger.debug(f"Target anchor transition beat (relative to section start): {target_anchor_beat:.2f}")

    # 3. Find the anchor note/rest active at this target beat
    active_note: Optional[Note] = None
    for note in anchor_notes:
        if note.beat is None or note.end_beat is None: continue
        # Check if target beat falls within this note/rest's duration
        if note.beat <= (target_anchor_beat + FLOAT_TOLERANCE) and note.end_beat > (target_anchor_beat - FLOAT_TOLERANCE):
            active_note = note
            logger.debug(f"Transition time falls within anchor note/rest starting at beat {note.beat:.2f} (IsRest: {note.is_rest})")
            break

    if active_note is None or active_note.beat is None:
         # Could happen if transition time is after the last note ends but still within section duration
         # Or if melody data is sparse. Let's try to find the *last* note that starts *before* the target beat.
         logger.warning(f"No anchor note/rest found strictly containing target beat {target_anchor_beat:.2f}. Searching for last note starting before.")
         last_note_before: Optional[Note] = None
         for note in reversed(anchor_notes):
              if note.beat is not None and note.beat <= (target_anchor_beat + FLOAT_TOLERANCE):
                  last_note_before = note
                  break
         if last_note_before and last_note_before.beat is not None:
             logger.info(f"Using start of last note before target: Beat {last_note_before.beat:.2f}")
             active_note = last_note_before
         else:
             logger.error(f"Cannot determine anchor transition start point around beat {target_anchor_beat:.2f}.")
             return None # Cannot determine start point

    # 4. Determine the final anchor start beat (always use the start of the active note/rest)
    anchor_transition_start_beat = active_note.beat

    # 5. Convert this beat back to source and project times
    anchor_transition_offset_s = beats_to_seconds(anchor_transition_start_beat, anchor_bpm)
    if anchor_transition_offset_s is None: return None

    anchor_source_start_time = anchor_section_start_s + anchor_transition_offset_s
    anchor_project_start_time = section_project_start_time + (anchor_transition_offset_s / anchor_playback_rate)

    logger.info(f"Determined anchor transition start: Beat={anchor_transition_start_beat:.2f}, "
                f"SourceTime={anchor_source_start_time:.2f}, ProjectTime={anchor_project_start_time:.2f}")

    return anchor_transition_start_beat, anchor_source_start_time, anchor_project_start_time



# --- Timeline Creation ---

async def create_timeline_from_pairings(
    pairings: List[Tuple[InputSection, Optional[InputSection]]],
    all_stem_paths: Dict[str, Dict[str, str]], # { source_track_id: { stem_type: storage_path } }
) -> Tuple[Dict, Set[str]]:
    """
    Creates the timeline JSON based on anchor instrumentals and guided vocal injection. Includes refined transition logic based on finding
    a suitable cut point in the suggestion vocal melody when bleed is disallowed.
    """
    logger.info("Creating timeline from pairings...")
    timeline_json: Dict = {
        "tracks": [],
    }
    required_stem_paths_set: Set[str] = set()
    # Keep track of added tracks to avoid duplicates {storage_path: track_object}
    added_tracks: Dict[str, Dict] = {}
    # Keep track of the absolute end time of the last placed clip in the project timeline
    current_project_end_time: float = 0.0
    instrumental_stem_types = ["no_vocals",]
    vocal_stem_type = "vocals"

    for i, (anchor_section, suggestion_section) in enumerate(pairings):
        logger.debug(f"\n--- Processing Pair {i+1}: Anchor {anchor_section.hooktheory_section_id} | Suggestion {suggestion_section.hooktheory_section_id if suggestion_section else 'None'} ---")

        # --- A. Calculate Anchor Section Timing in Project ---
        anchor_start_s = anchor_section.start_time_s
        anchor_end_s = anchor_section.end_time_s
        anchor_bpm = anchor_section.bpm
        anchor_meter_num = anchor_section.meter  # meter metadata reps num beats in measure
        anchor_src_id = anchor_section.source_track_id
        anchor_stems = all_stem_paths.get(anchor_src_id)
        anchor_melody_data = anchor_section.melody

        if anchor_end_s is None or anchor_start_s is None:
             logger.warning(f"Skipping anchor section {anchor_section.hooktheory_section_id}: Missing start/end time.")
             continue
        if anchor_end_s <= anchor_start_s:
             logger.warning(f"Skipping anchor section {anchor_section.hooktheory_section_id}: End time is not after start time.")
             continue

        anchor_section_source_duration = anchor_end_s - anchor_start_s

        # Handle gaps/overlaps between consecutive anchor sections
        section_project_start_time: float
        if i == 0:
             # First section starts at time 0
             section_project_start_time = 0.0
        else:
            previous_anchor_end_s = pairings[i-1][0].end_time_s
            time_since_last_section = anchor_start_s - (pairings[i-1][0].end_time_s or anchor_start_s) # Compare source start to previous source end
            #  if time_since_last_section > SECTION_GAP_THRESHOLD:
            #       # Significant gap in source, preserve it by setting start relative to source
            #       # This needs careful thought. Let's simplify: make sections sequential unless there's a huge jump in source time
            #       # Alternative: Use current_project_end_time as the primary placement guide
            #       gap_from_previous_in_project = current_project_end_time - (pairings[i-1][0].end_time_s or anchor_start_s) # How much project time elapsed vs source time elapsed? Difficult.

            #       # Simpler approach: If source starts much later than previous source ended, add gap based on source diff
            #       # Let's stick to the butt-joint / preserve large source gap method for now:
            if previous_anchor_end_s is not None and anchor_start_s > (previous_anchor_end_s + SECTION_GAP_THRESHOLD):
                # Large gap detected in source timestamps, reflect this.
                # Start this section later in the project timeline.
                gap_to_add = anchor_start_s - previous_anchor_end_s # Approximate gap length
                section_project_start_time = current_project_end_time + gap_to_add # Add gap after previous clip ended
                logger.info(f"Preserving large source gap (~{gap_to_add:.2f}s) before anchor section {i+1}.")
            else:
                # Small gap or overlap, just place it right after the previous section ends
                section_project_start_time = current_project_end_time
            #  else:
            #      # Place immediately after previous section in project time
            #      section_project_start_time = current_project_end_time

        # Calculate project duration and end time for this section (scaled by BPM)
        anchor_playback_rate = 1.0
        section_project_duration = anchor_section_source_duration / anchor_playback_rate
        section_project_end_time = section_project_start_time + section_project_duration

        # --- B. Add Anchor Instrumental Clips ---
        anchor_src_id = anchor_section.source_track_id
        anchor_stems = all_stem_paths.get(anchor_src_id)

        if not anchor_stems:
            logger.warning(f"No stems found for anchor source {anchor_src_id}. Skipping instrumental addition.")
        else:
            for stem_type in instrumental_stem_types:
                if stem_type in anchor_stems:
                    storage_path = anchor_stems[stem_type]
                    required_stem_paths_set.add(storage_path)

                    if storage_path not in added_tracks:
                        track_obj = {"stem_path": storage_path, "clips": []}
                        timeline_json["tracks"].append(track_obj)
                        added_tracks[storage_path] = track_obj
                    else:
                        track_obj = added_tracks[storage_path]

                    # Add clip for this instrumental
                    track_obj["clips"].append({
                        "id": f"clip_{anchor_section.hooktheory_section_id[:6]}_{stem_type}",
                        "project_start_time": round(section_project_start_time, 3),
                        "source_start_time": round(anchor_start_s, 3),
                        "source_duration": round(anchor_section_source_duration, 3),
                        "playback_rate": round(anchor_playback_rate, 3),
                        "gain": 1.0, # Adjust gain as needed
                        "pan": 0.0, # Center instrumentals by default
                    })
                else:
                    logger.debug(f"Anchor stem '{stem_type}' not found for {anchor_src_id}")

        suggestion_vocal_clip_added = False
        # --- C. Add Suggestion Vocal Clip (Guided by Anchor Melody) ---
        if suggestion_section:
            logger.debug(f'working on suggestion section: {suggestion_section.section_name}')
            suggestion_src_id = suggestion_section.source_track_id
            suggestion_stems = all_stem_paths.get(suggestion_src_id)
            suggestion_melody_data = suggestion_section.melody # Raw melody data
            suggestion_bpm = suggestion_section.bpm
            suggestion_meter_num = suggestion_section.meter 
            suggestion_beatUnit = suggestion_section.beatUnit 

            anchor_melody_data = anchor_section.melody # Raw anchor melody data

            # Check prerequisites
            if (not suggestion_stems or vocal_stem_type not in suggestion_stems or
                not suggestion_melody_data or not anchor_melody_data or
                not suggestion_bpm or suggestion_bpm <= 0):
                logger.warning(f"Skipping suggestion vocal for pair {i+1} due to missing data/stems.")
            else:
                vocal_storage_path = suggestion_stems[vocal_stem_type]
                required_stem_paths_set.add(vocal_storage_path)
                anchor_melody_notes = parse_melody_or_cp_data(anchor_melody_data)
                suggestion_melody_notes = parse_melody_or_cp_data(suggestion_melody_data)

                if not anchor_melody_notes or not suggestion_melody_notes:
                     logger.warning("Failed to parse anchor or suggestion melody. Cannot add vocals.")
                else:
                    # Find first *sounding* note beat in anchor melody
                    first_anchor_note_beat = next((n.beat for n in anchor_melody_notes if not n.is_rest and n.beat is not None), None)

                    # Find vocal chunks in suggestion melody
                    vocal_chunks = find_vocal_chunks(suggestion_melody_notes)
        
                    if first_anchor_note_beat is None or not vocal_chunks:
                         logger.warning("Skipping suggestion vocal: Cannot find anchor start note or suggestion vocal chunks.")
                    else:
                        # --- Calculate Initial Suggestion Vocal Timing ---
                        chunk_start_beat = vocal_chunks[0][0] # Use chunk start for reference
                        chunk_end_beat = vocal_chunks[-1][1]

                        logger.debug(f"Suggestion vocal chunk start beat: {chunk_start_beat}, end beat: {chunk_end_beat}")

                         # Calculate the offset of the vocal chunk within its own section
                        vocal_chunk_offset_s = beats_to_seconds(chunk_start_beat, suggestion_bpm)
                        vocal_chunk_end_offset_s = beats_to_seconds(chunk_end_beat, suggestion_bpm)

                        if vocal_chunk_offset_s is None or vocal_chunk_end_offset_s is None:
                            logger.warning("Could not calculate vocal chunk offsets in seconds. Skipping.")
                            continue # Skip this vocal pairing

                        # CORRECT: Calculate the absolute source start time
                        # Base time of the matched section + offset of the vocal phrase
                        logger.debug(f"Suggestion vocal chunk offsets: Start {vocal_chunk_offset_s:.2f}s, End {vocal_chunk_end_offset_s:.2f}s")
                        vocal_source_start_time_s = suggestion_section.start_time_s + vocal_chunk_offset_s
                        vocal_source_end_time_s = suggestion_section.start_time_s + vocal_chunk_end_offset_s

                        if vocal_source_start_time_s is None or vocal_source_end_time_s is None or (vocal_source_end_time_s - vocal_source_start_time_s <= 0):
                             logger.warning("Skipping suggestion vocal: Invalid calculated chunk source times/duration.")
                        else:
                            # Calculate project start time guided by anchor's first note
                            vocal_source_duration_s = vocal_source_end_time_s - vocal_source_start_time_s
                            anchor_first_note_offset_s = beats_to_seconds(first_anchor_note_beat, anchor_bpm)

                            if anchor_first_note_offset_s is None: vocal_project_start_time = section_project_start_time
                            else:
                                anchor_first_note_project_offset = anchor_first_note_offset_s / anchor_playback_rate
                                vocal_project_start_time = section_project_start_time + anchor_first_note_project_offset

                            vocal_playback_rate = anchor_bpm/(suggestion_bpm*anchor_meter_num / suggestion_meter_num * suggestion_beatUnit) if suggestion_bpm and anchor_bpm > 0 else 1.0
                            vocal_project_duration = vocal_source_duration_s / vocal_playback_rate
                            initial_vocal_project_end_time = vocal_project_start_time + vocal_project_duration

                            # --- Bleed Check and Potential Truncation/Transition ---
                            final_vocal_source_duration_s = vocal_source_duration_s # Start with full duration
                            suggestion_clip_project_end_time = initial_vocal_project_end_time

                            if initial_vocal_project_end_time > (section_project_end_time + FLOAT_TOLERANCE):
                                logger.debug(f"Suggestion vocal clip initial end ({initial_vocal_project_end_time:.2f}) extends past anchor section end ({section_project_end_time:.2f}). Checking bleed rules.")
                                allow_bleed = False # Check bleed rules (same logic as before)
                                if (i + 1) < len(pairings):
                                     logger.debug(f"working on {anchor_section.section_name} in anchor, and {pairings[i+1][0].section_name} in next anchor")
                                     next_anchor_category = get_section_category(pairings[i+1][0].section_name)
                                     current_anchor_category = get_section_category(anchor_section.section_name)
                                     logger.debug(f"Current anchor category: {current_anchor_category}, Next anchor category: {next_anchor_category}")
                                     if current_anchor_category in ['Build-Up', 'Misc'] and next_anchor_category in ['Build-Up', 'Misc']: allow_bleed = True
                                if allow_bleed: logger.debug("Bleeding allowed.")
                                else:
                                    logger.info("Bleeding NOT allowed. Finding suggestion cut point and planning anchor transition.")
                                    add_anchor_transition_clip = True # Flag for anchor transition

                                    # Find the new suggestion end beat using the refined backwards search
                                    max_allowed_proj_duration = section_project_end_time - vocal_project_start_time
                                    new_suggestion_end_beat = find_suggestion_cut_beat(
                                        suggestion_melody_notes,
                                        suggestion_bpm,
                                        chunk_start_beat,
                                        max_allowed_proj_duration,
                                        vocal_playback_rate
                                    )

                                    if new_suggestion_end_beat is None or new_suggestion_end_beat <= chunk_start_beat:
                                        logger.warning("Failed to find suitable suggestion cut point. Suggestion vocal will be skipped.")
                                        final_vocal_source_duration_s = 0
                                        add_anchor_transition_clip = False # Can't transition if suggestion is skipped
                                    else:
                                        logger.debug(f"New suggestion end beat found: {new_suggestion_end_beat:.2f} (source)")
                                        # Calculate new source end time and duration for suggestion
                                        new_vocal_source_end_time_s = beats_to_seconds(new_suggestion_end_beat, suggestion_bpm)
                                        logger.debug(f"New suggestion end time in source: {new_vocal_source_end_time_s:.2f}s")
                                        if new_vocal_source_end_time_s is None:
                                            logger.warning("Failed to convert new suggestion end beat to time. Skipping suggestion.")
                                            final_vocal_source_duration_s = 0
                                            add_anchor_transition_clip = False
                                        else:
                                            # final_vocal_source_duration_s = new_vocal_source_end_time_s - vocal_source_start_time_s   # OLD ERROR IN NEGATIVE DURATION
                                            final_vocal_source_duration_s = new_vocal_source_end_time_s
                                            # Recalculate suggestion clip's actual end time in project
                                            suggestion_clip_project_end_time = vocal_project_start_time + (final_vocal_source_duration_s / vocal_playback_rate)
                                            logger.info(f"Suggestion vocal truncated: New Source Duration {final_vocal_source_duration_s:.2f}s, New Project End {suggestion_clip_project_end_time:.2f}s")

                            # suggestion_vocal_clip_added = False
                            if final_vocal_source_duration_s > FLOAT_TOLERANCE:
                                # ... (your existing code to add the suggestion vocal clip) ...
                                track_obj = added_tracks.setdefault(vocal_storage_path, {"stem_path": vocal_storage_path, "clips": []})
                                if not any(t is track_obj for t in timeline_json["tracks"]): timeline_json["tracks"].append(track_obj)
                                track_obj["clips"].append({
                                    "id": f"clip_{suggestion_section.hooktheory_section_id[:6]}_{vocal_stem_type}",
                                    "project_start_time": round(vocal_project_start_time, 3),
                                    "source_start_time": round(vocal_source_start_time_s, 3),
                                    "source_duration": round(final_vocal_source_duration_s, 3),
                                    "playback_rate": round(vocal_playback_rate, 3),
                                    "gain": 0.95, "pan": 0.0,
                                })
                                suggestion_vocal_clip_added = True
                                # Recalculate the actual end time after potential truncation
                                suggestion_clip_project_end_time = vocal_project_start_time + (final_vocal_source_duration_s / vocal_playback_rate)
                            else:
                                suggestion_clip_project_end_time = None

                            # --- REFACTORED GAP-FILLING LOGIC ---
                            # Check if there's a significant gap AFTER the suggestion vocal ends.
                            gap_after_suggestion = section_project_end_time - (suggestion_clip_project_end_time or section_project_start_time)

                            if suggestion_vocal_clip_added and gap_after_suggestion > VOCAL_GAP_FALLBACK_THRESHOLD:
                                logger.info(f"Gap of {gap_after_suggestion:.2f}s detected after suggestion vocal. Attempting to fill with anchor vocal.")

                                if not anchor_stems or vocal_stem_type not in anchor_stems or not anchor_melody_notes or not anchor_bpm:
                                    logger.warning("Cannot add anchor transition: Missing anchor stems, melody, or BPM.")
                                else:
                                    anchor_vocal_storage_path = anchor_stems[vocal_stem_type]
                                    required_stem_paths_set.add(anchor_vocal_storage_path)

                                    # Find where the anchor vocal should start based on where the suggestion vocal ended.
                                    anchor_start_info = find_anchor_transition_start_info(
                                        anchor_melody_notes, anchor_bpm, anchor_start_s,
                                        anchor_playback_rate, suggestion_clip_project_end_time,
                                        section_project_start_time
                                    )

                                    if anchor_start_info:
                                        _anchor_beat, av_source_start_time, av_project_start_time = anchor_start_info
                                        av_source_start_time = max(anchor_start_s, min(av_source_start_time, anchor_end_s - FLOAT_TOLERANCE))
                                        av_project_start_time = max(section_project_start_time, min(av_project_start_time, section_project_end_time - FLOAT_TOLERANCE))
                                        av_source_duration = anchor_end_s - av_source_start_time

                                        if av_source_duration > FLOAT_TOLERANCE:
                                            logger.info(f"Adding anchor vocal transition clip...")
                                            track_obj = added_tracks.setdefault(anchor_vocal_storage_path, {"stem_path": anchor_vocal_storage_path, "clips": []})
                                            if not any(t is track_obj for t in timeline_json["tracks"]): timeline_json["tracks"].append(track_obj)
                                            track_obj["clips"].append({
                                                "id": f"clip_{anchor_section.hooktheory_section_id[:6]}_anchor_vox_trans",
                                                "project_start_time": round(av_project_start_time, 3),
                                                "source_start_time": round(av_source_start_time, 3),
                                                "source_duration": round(av_source_duration, 3),
                                                "playback_rate": round(anchor_playback_rate, 3),
                                                "gain": 1.0, "pan": 0.0,
                                            })

                                        else: logger.warning("Skipping anchor transition clip: Calculated source duration too short.")
                                    else: logger.warning("Skipping anchor transition clip: Failed to find anchor start info.")


        # --- D. Fallback: Add Full Anchor Vocal if Suggestion wasn't used ---
        if not suggestion_vocal_clip_added:
             logger.debug(f"No suggestion vocal added for pair {i+1}. Checking for anchor vocal fallback.")
             # ... (Fallback logic remains the same) ...
             if anchor_stems and vocal_stem_type in anchor_stems:
                 anchor_vocal_storage_path = anchor_stems[vocal_stem_type]
                 required_stem_paths_set.add(anchor_vocal_storage_path)
                 track_obj = added_tracks.setdefault(anchor_vocal_storage_path, {"stem_path": anchor_vocal_storage_path, "clips": []})
                 if not any(t is track_obj for t in timeline_json["tracks"]): timeline_json["tracks"].append(track_obj)
                 track_obj["clips"].append({
                     "id": f"clip_{anchor_section.hooktheory_section_id[:6]}_anchor_vox_full",
                     "project_start_time": round(section_project_start_time, 3), "source_start_time": round(anchor_start_s, 3),
                     "source_duration": round(anchor_section_source_duration, 3), "playback_rate": round(anchor_playback_rate, 3),
                     "gain": 1.0, "pan": 0.0,
                 })
                 logger.info("Added full anchor vocal clip as fallback.")


        # Update the overall project end time based on the anchor section's placement
        current_project_end_time = max(current_project_end_time, section_project_end_time)

    # --- Post Processing: Remove tracks with no clips ---
    timeline_json["tracks"] = [t for t in timeline_json["tracks"] if t.get("clips")]

    logger.info(f"Created timeline structure with {len(timeline_json['tracks'])} tracks and {sum(len(t['clips']) for t in timeline_json['tracks'])} clips.")
    logger.debug(f"Timeline requires {len(required_stem_paths_set)} unique stems.")

    return timeline_json, required_stem_paths_set
