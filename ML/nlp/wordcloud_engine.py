import re
import math
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional

# Custom domain-specific stopwords for coal mining and legislative/administrative context
COAL_MINING_STOPWORDS = {
    # Standard English stopwords
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he",
    "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll",
    "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
    "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
    "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves",
    # Administrative & legislative boilerplate words to filter out
    "shall", "pursuant", "section", "sub-section", "act", "rule", "regulations", "dated", "annexure",
    "table", "figure", "page", "per", "stated", "mentioned", "regard", "reference", "attached", "copy",
    "letter", "ministry", "coal", "india", "limited", "cil", "subsidiary", "subsidiaries", "details",
    "regarding", "question", "answered", "lok", "sabha", "rajya", "government", "parliament", "sir",
    "madam", "hon'ble", "minister", "state", "given", "below", "following", "total", "year", "years", "fy"
}

# Domain vocabulary boost weights
DOMAIN_IMPORTANCE_BOOST = {
    "overburden": 1.6,
    "obr": 1.6,
    "coking": 1.5,
    "washery": 1.5,
    "exploration": 1.4,
    "borehole": 1.5,
    "geological": 1.4,
    "reserves": 1.4,
    "gcv": 1.5,
    "grade": 1.3,
    "rake": 1.4,
    "offtake": 1.4,
    "dispatch": 1.3,
    "opencast": 1.3,
    "underground": 1.3,
    "dragline": 1.5,
    "shovels": 1.3,
    "dumpers": 1.3,
    "subsidence": 1.4,
    "methane": 1.4,
    "degasification": 1.5,
    "reclamation": 1.4,
    "jharia": 1.3,
    "raniganj": 1.3,
    "singrauli": 1.3,
    "korba": 1.3,
    "talcher": 1.3,
    "ib-valley": 1.3,
    "fmc": 1.5,
    "rail-corridor": 1.4,
    "siding": 1.3,
    "monsoon": 1.2,
    "safety": 1.3,
    "dgms": 1.4
}

class WordCloudEngine:
    def __init__(self):
        pass

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        text = re.sub(r'[^\w\s-]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_word_cloud(self, texts: List[str], max_words: int = 60, min_word_len: int = 3, documents: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        word_counts = Counter()
        bigram_counts = Counter()
        exact_counts = Counter()
        doc_sources = defaultdict(lambda: defaultdict(int))
        doc_snippets = defaultdict(dict)

        # Process by document if available for citation traceability
        doc_items = documents if documents and len(documents) > 0 else [{"id": f"DOC-{i+1}", "name": f"Document {i+1}", "text": t} for i, t in enumerate(texts)]

        for doc in doc_items:
            doc_id = doc.get("id", "DOC")
            doc_name = doc.get("name", "Document")
            text = doc.get("text", "")
            cleaned = self.clean_text(text)
            tokens = cleaned.split()
            
            valid_tokens = [
                tok for tok in tokens 
                if len(tok) >= min_word_len 
                and tok not in COAL_MINING_STOPWORDS 
                and not tok.isdigit()
            ]

            for tok in valid_tokens:
                boost = DOMAIN_IMPORTANCE_BOOST.get(tok, 1.0)
                word_counts[tok] += (1.0 * boost)
                exact_counts[tok] += 1
                doc_sources[tok][doc_id] += 1
                if doc_id not in doc_snippets[tok]:
                    # Find a brief snippet containing this token
                    sentences = re.split(r'[.\n]', text)
                    for s in sentences:
                        if tok in s.lower():
                            doc_snippets[tok][doc_id] = s.strip()[:140]
                            break

            for i in range(len(valid_tokens) - 1):
                bg = f"{valid_tokens[i]} {valid_tokens[i+1]}"
                if valid_tokens[i] in DOMAIN_IMPORTANCE_BOOST or valid_tokens[i+1] in DOMAIN_IMPORTANCE_BOOST:
                    bigram_counts[bg] += 1.5
                    exact_counts[bg] += 1
                    doc_sources[bg][doc_id] += 1
                    if doc_id not in doc_snippets[bg]:
                        sentences = re.split(r'[.\n]', text)
                        for s in sentences:
                            if valid_tokens[i] in s.lower() and valid_tokens[i+1] in s.lower():
                                doc_snippets[bg][doc_id] = s.strip()[:140]
                                break

        combined = dict(word_counts)
        for bg, count in bigram_counts.items():
            if count >= 1:
                combined[bg] = count * 1.8

        if not combined:
            return []

        max_val = max(combined.values())
        min_val = min(combined.values())

        sorted_words = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:max_words]

        # Map doc_id to doc_name
        doc_name_map = {d.get("id", ""): d.get("name", "") for d in doc_items}

        result = []
        for word, count in sorted_words:
            if max_val == min_val:
                weight = 50
            else:
                weight = int(18 + ((count - min_val) / (max_val - min_val)) * 82)

            category = self._categorize_keyword(word)
            raw_occ = int(exact_counts.get(word, 1))

            # Build list of dynamic sources for this keyword
            sources_list = []
            for d_id, d_cnt in doc_sources[word].items():
                sources_list.append({
                    "id": d_id,
                    "name": doc_name_map.get(d_id, d_id),
                    "count": d_cnt,
                    "snippet": doc_snippets[word].get(d_id, "")
                })

            result.append({
                "text": word,
                "value": weight,
                "rawCount": raw_occ,
                "occurrences": raw_occ,
                "category": category,
                "sources": sources_list
            })

        return result

    def _categorize_keyword(self, word: str) -> str:
        w = word.lower()
        if any(k in w for k in ["overburden", "obr", "production", "target", "achievement", "offtake", "dispatch", "stock", "rake", "rail"]):
            return "Production & Logistics"
        elif any(k in w for k in ["borehole", "geological", "reserves", "seam", "exploration", "cmpdi", "drilling", "grade", "gcv"]):
            return "Geology & Exploration"
        elif any(k in w for k in ["coking", "washery", "ash", "beneficiation", "import", "substitution"]):
            return "Coking & Washery"
        elif any(k in w for k in ["safety", "dgms", "accident", "fatality", "rescue", "inundation", "subsidence"]):
            return "Safety & Statutory"
        elif any(k in w for k in ["environment", "reclamation", "forest", "clearance", "afforestation", "plantation", "methane"]):
            return "Environment & ESG"
        elif any(k in w for k in ["secl", "mcl", "bccl", "ccl", "ecl", "wcl", "ncl"]):
            return "Subsidiaries"
        return "General Operations"

    def extract_topics(self, texts: List[Dict[str, Any]], num_topics: int = 5) -> List[Dict[str, Any]]:
        predefined_clusters = [
            {
                "id": "TOPIC-1",
                "name": "Overburden Removal & Heavy Machinery Fleet",
                "category": "Mining Operations",
                "keywords": ["overburden", "obr", "dragline", "shovel", "dumper", "stripping ratio", "opencast"],
                "docs": []
            },
            {
                "id": "TOPIC-2",
                "name": "Parliamentary Inquiries on Coking Coal & Washeries",
                "category": "Policy & Quality",
                "keywords": ["coking", "washery", "import substitution", "steel", "ash content", "bccl", "ccl"],
                "docs": []
            },
            {
                "id": "TOPIC-3",
                "name": "CMPDI Geological Exploration & Block Reserve Estimation",
                "category": "Geological Intelligence",
                "keywords": ["cmpdi", "exploration", "drilling", "borehole", "proved reserves", "inferred", "seam thickness"],
                "docs": []
            },
            {
                "id": "TOPIC-4",
                "name": "First Mile Connectivity (FMC) & Rail Siding Infrastructure",
                "category": "Logistics & Offtake",
                "keywords": ["rail corridor", "fmc", "siding", "rake loading", "silo", "conveyor", "talcher", "mcl"],
                "docs": []
            },
            {
                "id": "TOPIC-5",
                "name": "Mine Safety, DGMS Compliance & Environmental Clearances",
                "category": "Compliance & ESG",
                "keywords": ["safety", "dgms", "reclamation", "forest clearance", "subsidence", "environment"],
                "docs": []
            }
        ]

        for doc in texts:
            content = (doc.get("content", "") + " " + doc.get("title", "") + " " + doc.get("subject", "")).lower()
            best_cluster = None
            max_hits = 0

            for cluster in predefined_clusters:
                hits = sum(1 for kw in cluster["keywords"] if kw in content)
                if hits > max_hits:
                    max_hits = hits
                    best_cluster = cluster

            if best_cluster and max_hits > 0:
                best_cluster["docs"].append(doc.get("id") or doc.get("title", "Doc"))
            else:
                predefined_clusters[0]["docs"].append(doc.get("id") or doc.get("title", "Doc"))

        topics = []
        for c in predefined_clusters:
            doc_count = len(c["docs"])
            topics.append({
                "id": c["id"],
                "topicName": c["name"],
                "category": c["category"],
                "keyTerms": c["keywords"][:5],
                "documentCount": doc_count,
                "relevanceScore": round(min(1.0, 0.4 + (doc_count * 0.12)), 2),
                "trend": "increasing" if doc_count > 2 else "stable"
            })

        topics.sort(key=lambda x: x["documentCount"], reverse=True)
        return topics
