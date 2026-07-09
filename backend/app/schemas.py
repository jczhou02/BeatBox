from typing import Optional, List, Dict, Union, Any
from pydantic import BaseModel, Field, ConfigDict


class InputSection(BaseModel):
    hooktheory_section_id: str = Field(alias="id")  # Use 'id' as the alias for compatibility
    source_track_id: str | None
    artist: str
    title: str
    section_name: Optional[str] = Field(default=None, alias="section")
    key: Optional[str] = None
    scale: Optional[str] = None
    bpm: Optional[int] = None
    meter: Optional[int] = None   # number of beats in a measure
    beatUnit: Optional[int] = None    # how much a beat is worth
    chord_progression: Optional[str] = Field(default=None, alias="chord progression")
    cp: Optional[Union[str, List[Dict[str, Any]]]] = None
    melody: Optional[Union[str, List[Dict[str, Any]]]] = None
    youtube_id: Optional[str] = None # Used for download if needed
    start_time_s: float = Field(default=None, alias="start timestamp (s)")
    end_time_s: Optional[float] = Field(default=None, alias="end timestamp (s)")
    section_duration_ms: Optional[int] = Field(default=None, alias="duration (ms)")
    genre: Optional[str] = Field(default=None, alias="genre")
    cp_compare: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True, # Equivalent to orm_mode=True in Pydantic v1
    )

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
