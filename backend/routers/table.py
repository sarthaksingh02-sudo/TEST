from fastapi import APIRouter
from typing import List, Dict, Any
from pydantic import BaseModel
from services.tabular_extractor import extract_parameters_from_documents, suggest_parameters_for_documents

router = APIRouter(prefix="/api", tags=["table"])

class TableExtractionRequest(BaseModel):
    parameters: List[str]

class TableExtractionRow(BaseModel):
    source_file: str
    extracted_data: Dict[str, str]

class TableExtractionResponse(BaseModel):
    rows: List[TableExtractionRow]
    parameters: List[str]

@router.post("/table/{session_id}", response_model=TableExtractionResponse)
async def get_extracted_table(session_id: str, request: TableExtractionRequest):
    """User provides a list of parameters, gets back a table (rows of dictionaries) matching each document."""
    
    # Default parameters if none provided
    params = request.parameters
    if not params:
        params = ["Disease", "Gene", "Symptoms", "Effective Prevention/Drugs"]
        
    extracted_data = extract_parameters_from_documents(session_id, params)
    
    return TableExtractionResponse(
        rows=[TableExtractionRow(source_file=r["source_file"], extracted_data=r["extracted_data"]) for r in extracted_data],
        parameters=params
    )

class AutoSuggestResponse(BaseModel):
    parameters: List[str]

@router.get("/table/{session_id}/auto-suggest", response_model=AutoSuggestResponse)
async def auto_suggest_params(session_id: str):
    """Auto-detects optimal table parameters based on document chunks in session."""
    params = suggest_parameters_for_documents(session_id)
    return AutoSuggestResponse(parameters=params)
