import json
from typing import List, Dict, Any
from services.vector_store import get_or_create_collection, _generate_with_retry
from config import GEMINI_MODEL

def extract_parameters_from_documents(session_id: str, parameters: List[str]) -> List[Dict[str, Any]]:
    collection_name = f"session_{session_id}"
    collection = get_or_create_collection(collection_name)
    
    if collection.count() == 0:
        return []
        
    results = collection.get()
    documents = results.get("documents", [])
    metadatas = results.get("metadatas", [])
    
    if not documents or not metadatas:
        return []
        
    # Group text by source file
    file_contents = {}
    for doc, meta in zip(documents, metadatas):
        source = meta.get("source", "Unknown Document")
        if source not in file_contents:
            file_contents[source] = []
        file_contents[source].append(doc)
        
    extracted_rows = []
    
    # Process each file with Gemini
    for source, chunks in file_contents.items():
        combined_text = "\n\n".join(chunks)
        
        # If the file is extremely large, we might need to truncate or chunk it,
        # but Gemini 1.5 generally handles large contexts well.
        # We will truncate to roughly 500,000 characters to be safe for API limits.
        combined_text = combined_text[:500000] 
        
        prompt = f"""You are a clinical evidence extraction assistant.
You have been provided with the full text of a medical document named "{source}".

Your task is to extract information from this document for the following parameters:
{json.dumps(parameters, indent=2)}

Please return the extracted data ONLY as a valid JSON object where the keys are the exact parameter names provided above.

CRITICAL INSTRUCTION: Next to every extracted value, you MUST append a confidence score in brackets, like this: "Detailed answer text [95%]".
If a parameter's information is not found in the text, its value should be "Not found [100%]".
Keep the extracted values concise but informative.

--- DOCUMENT TEXT ---
{combined_text}
--- END DOCUMENT TEXT ---

Output ONLY a valid JSON object. No Markdown formatting, no code blocks like ```json.
"""
        try:
            response = _generate_with_retry(
                model=GEMINI_MODEL,
                contents=prompt,
            )
            text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            extracted_data = json.loads(text)
            
            # Ensure all asked parameters exist in the response
            for param in parameters:
                if param not in extracted_data:
                    extracted_data[param] = "Not found"
                    
            extracted_rows.append({
                "source_file": source,
                "extracted_data": extracted_data
            })
        except Exception as e:
            print(f"Extraction error for {source}: {e}")
            error_data = {param: "Extraction Error" for param in parameters}
            extracted_rows.append({
                "source_file": source,
                "extracted_data": error_data
            })
            
    return extracted_rows

def suggest_parameters_for_documents(session_id: str) -> List[str]:
    collection_name = f"session_{session_id}"
    collection = get_or_create_collection(collection_name)
    
    if collection.count() == 0:
        return ["Disease", "Symptoms", "Treatment"]
    
    results = collection.get()
    documents = results.get("documents", [])
    if not documents:
        return ["Disease", "Symptoms", "Treatment"]
        
    sample_text = "\n\n".join(documents[:10])[:50000]
    prompt = f"""You are a clinical evidence extraction assistant.
A user uploaded medical documents containing the following text snippet.

--- DOCUMENT TEXT ---
{sample_text}
--- END DOCUMENT TEXT ---

Please analyze the text and suggest 4 to 6 of the most relevant table headers (parameters) that a researcher would want to extract from this specific type of document into a spreadsheet.
Output ONLY a valid JSON array of strings, e.g. ["Disease", "Target Gene", "Patient Demographics", "Clinical Trial Phase"]. 
No Markdown formatting.
"""
    try:
        response = _generate_with_retry(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        suggested = json.loads(text)
        if isinstance(suggested, list) and all(isinstance(x, str) for x in suggested):
            return suggested
        return ["Disease", "Gene", "Symptoms", "Effective Prevention/Drugs"]
    except Exception as e:
        print(f"Auto-suggest error: {e}")
        return ["Disease", "Gene", "Symptoms", "Effective Prevention/Drugs"]

