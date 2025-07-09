from typing import Optional, List, Dict, Union, Any
from pydantic import BaseModel, Field


class InputSection(BaseModel):
    hooktheory_section_id: str
    source_track_id: str | None
    artist: str
    title: str
    section_name: Optional[str] = None
    key: Optional[str] = None
    scale: Optional[str] = None
    bpm: Optional[int] = None
    meter: Optional[int] = None   # number of beats in a measure
    beatUnit: Optional[int] = None    # how much a beat is worth
    chord_progression: Optional[str] = None
    cp: Optional[Union[str, List[Dict[str, Any]]]] = None
    melody: Optional[Union[str, List[Dict[str, Any]]]] = None
    youtube_id: Optional[str] = None # Used for download if needed
    start_time_s: float = 0.0
    end_time_s: Optional[float] = None
    section_duration_ms: Optional[int] = None
    genre: Optional[str] = None
    cp_compare: Optional[str] = None

class InputTrack(BaseModel):
    anchor: bool
    sections: List[InputSection]

class MashupPayload(BaseModel):
    tracks: List[InputTrack]
    mode: str
    numSuggestions: Optional[int] = Field(default=0, ge=0)
    temperature: float = Field(default=0.3, ge=0.0, le=5.0)

# Expected response structure from audio_processor
class MashupResult(BaseModel):
    timeline: Dict # The detailed timeline JSON for the DAW
    stem_urls: Dict[str, str] # Dictionary mapping stem_type to signed URL
