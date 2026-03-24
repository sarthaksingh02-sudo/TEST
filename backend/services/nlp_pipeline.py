# PURPOSE: Extract clinical named entities from text and classify into 5 types
# Types: DISEASE, DRUG, GENE, SYMPTOM, PREVENTION
# Anything that doesn't fit → discarded (not "related-to" junk)

import re
import spacy
from typing import List, Dict, Optional

# Load model with fallback
try:
    nlp = spacy.load("en_core_sci_sm")
    USING_SCISPACY = True
except OSError:
    try:
        nlp = spacy.load("en_core_web_sm")
        USING_SCISPACY = False
    except OSError:
        raise RuntimeError("No spaCy model found. Run: python -m spacy download en_core_web_sm")

# ── Map spaCy/scispaCy labels → our 5 types ─────────────────────────────────
LABEL_MAP = {
    # scispaCy labels
    "DISEASE": "DISEASE",
    "CANCER": "DISEASE",
    "PATHOLOGICAL_FORMATION": "DISEASE",
    "SIMPLE_CHEMICAL": "DRUG",
    "CHEMICAL": "DRUG",
    "GENE_OR_GENE_PRODUCT": "GENE",
    "PROTEIN": "GENE",
    "CELL": "GENE",
    "AMINO_ACID": "GENE",
    # en_core_web_sm labels (fallback) — looser mapping
    "PRODUCT": "DRUG",
    "SUBSTANCE": "DRUG",
}

# ── Keyword-based classification overrides ───────────────────────────────────
DISEASE_KEYWORDS = {
    "covid-19", "covid", "sars-cov-2", "coronavirus", "influenza", "pneumonia",
    "diabetes", "hypertension", "cancer", "infection", "syndrome", "disorder",
    "disease", "asthma", "tuberculosis", "hepatitis", "malaria", "sepsis",
    "fibrosis", "anemia", "leukemia", "lymphoma", "arthritis", "dementia",
    "alzheimer", "parkinson", "stroke", "infarction", "failure", "cardiomyopathy",
    "ards", "acute respiratory distress", "mers", "ebola", "hiv", "aids",
}

DRUG_KEYWORDS = {
    "metformin", "aspirin", "remdesivir", "dexamethasone", "hydroxychloroquine",
    "chloroquine", "ivermectin", "tocilizumab", "lopinavir", "ritonavir",
    "favipiravir", "azithromycin", "heparin", "corticosteroid", "steroid",
    "antibiotic", "antiviral", "inhibitor", "antibody", "monoclonal",
    "plasma", "convalescent", "interferon", "ribavirin", "oseltamivir",
    "paracetamol", "ibuprofen", "insulin", "statin", "ace inhibitor",
}

GENE_KEYWORDS = {
    "ace2", "spike protein", "rna", "dna", "mrna", "gene", "receptor",
    "cytokine", "interleukin", "il-6", "il-1", "tnf", "interferon",
    "igg", "igm", "iga", "antibody", "antigen", "cd4", "cd8",
    "brca1", "brca2", "p53", "egfr", "pcr", "rt-pcr", "protein",
    "enzyme", "kinase", "protease", "polymerase", "nucleotide",
}

SYMPTOM_KEYWORDS = {
    "fever", "fatigue", "cough", "dyspnea", "headache", "nausea",
    "vomiting", "diarrhea", "pain", "rash", "chills", "shortness of breath",
    "loss of smell", "anosmia", "myalgia", "malaise", "sore throat",
    "congestion", "runny nose", "tachycardia", "hypoxia", "inflammation",
    "edema", "swelling", "bleeding", "seizure", "confusion", "dizziness",
    "chest pain", "abdominal pain", "loss of taste", "ageusia", "wheezing",
}

PREVENTION_KEYWORDS = {
    "vaccine", "vaccination", "mask", "quarantine", "isolation",
    "social distancing", "sanitizer", "lockdown", "prophylaxis",
    "prevention", "protective", "immunization", "hygiene", "ppe",
    "hand washing", "ventilation", "testing", "screening", "tracing",
    "contact tracing", "distancing", "booster", "dose", "inoculation",
}

# ── Junk patterns ────────────────────────────────────────────────────────────
JUNK_PATTERNS = [
    r"^\d+[\./]\d+$",
    r"^\d+%$",
    r"^[a-z]{1,2}\.$",
    r"^\d+$",
    r"^[\d\s\.\,\-\+\/\%]+$",
    r"^[a-z]$",
    r"^\W+$",
]
COMPILED_JUNK = [re.compile(p, re.IGNORECASE) for p in JUNK_PATTERNS]

STOPWORDS = {
    "first", "second", "third", "fourth", "fifth",
    "at least", "at most", "however", "therefore", "moreover",
    "furthermore", "although", "whereas", "nevertheless",
    "also", "thus", "hence", "indeed", "specifically",
    "respectively", "approximately", "additionally",
    "more than", "less than", "greater than",
    "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "several", "many", "few",
    "study", "studies", "result", "results", "figure", "table",
    "method", "methods", "discussion", "conclusion", "abstract",
    "introduction", "reference", "references", "data", "analysis",
    "group", "groups", "patient", "patients", "sample", "samples",
    "case", "cases", "report", "reports", "review", "reviews",
    "use", "used", "using", "based", "include", "including",
    "total", "mean", "median", "average", "range", "baseline",
    "day", "days", "week", "weeks", "month", "months", "year", "years",
    "time", "times", "period", "number", "value", "level", "rate",
    "age", "male", "female", "men", "women", "adult", "adults",
    "positive", "negative", "high", "low", "normal",
    "china", "chinese", "wuhan", "italy", "united states",
    "et al", "figure", "table",
}


def classify_entity(text: str, spacy_label: str) -> Optional[str]:
    """Map entity to one of 5 types. Return None to discard."""
    norm = text.lower().strip()

    # Keyword-based override (highest priority)
    for kw in SYMPTOM_KEYWORDS:
        if kw in norm:
            return "SYMPTOM"
    for kw in PREVENTION_KEYWORDS:
        if kw in norm:
            return "PREVENTION"
    for kw in DISEASE_KEYWORDS:
        if kw in norm:
            return "DISEASE"
    for kw in DRUG_KEYWORDS:
        if kw in norm:
            return "DRUG"
    for kw in GENE_KEYWORDS:
        if kw in norm:
            return "GENE"

    # spaCy label map
    mapped = LABEL_MAP.get(spacy_label)
    if mapped:
        return mapped

    # If scispaCy "ENTITY" label — try harder with text heuristics
    if spacy_label == "ENTITY":
        # If it looks medical-ish (contains medical suffixes), keep as DISEASE
        medical_suffixes = ("itis", "osis", "emia", "opathy", "oma", "asis", "uria")
        for suf in medical_suffixes:
            if norm.endswith(suf):
                return "DISEASE"

    return None  # Discard


def is_junk(text: str) -> bool:
    norm = text.strip().lower()
    if len(norm) < 3:
        return True
    if norm in STOPWORDS:
        return True
    for pattern in COMPILED_JUNK:
        if pattern.match(norm):
            return True
    if not any(c.isalpha() for c in norm):
        return True
    return False


def extract_typed_entities(text: str) -> List[Dict]:
    """Extract entities, classify into 5 types, discard junk."""
    doc = nlp(text[:10000])
    entities = []
    seen = set()

    for ent in doc.ents:
        if is_junk(ent.text):
            continue
        entity_type = classify_entity(ent.text, ent.label_)
        if entity_type is None:
            continue
        norm = ent.text.lower().strip()
        if norm in seen:
            continue
        seen.add(norm)
        entities.append({
            "text": ent.text,
            "normalized": norm,
            "type": entity_type,
            "label": entity_type,  # compat with old code
            "normalized_text": norm,  # compat with old code
        })

    return entities


def extract_entities_from_chunks(chunks: List[Dict]) -> List[Dict]:
    """Run typed NER across all chunks, return globally deduplicated entity list."""
    all_entities = []
    seen_global = set()

    for chunk in chunks:
        chunk_ents = extract_typed_entities(chunk["text"])
        for ent in chunk_ents:
            key = (ent["normalized"], ent["type"])
            if key not in seen_global:
                seen_global.add(key)
                ent["source"] = chunk["source"]
                ent["page_number"] = chunk["page_number"]
                all_entities.append(ent)

    return all_entities
