import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def _mock_rag_and_chroma():
    mock_rag = MagicMock()
    mock_rag.search.return_value = {
        "status": "degraded",
        "results": [],
        "total": 0,
        "message": "mocked",
    }
    mock_chroma = MagicMock()
    mock_chroma.query.return_value = {"documents": [], "distances": [], "metadatas": []}
    mock_chroma.get_stats.return_value = {}
    mock_chroma.add_documents.return_value = 0
    mock_chroma.get_or_create_collection.return_value = MagicMock()
    with patch("backend.services.analyze_service.RAGService", return_value=mock_rag), \
         patch("backend.infra.chroma_client.ChromaClient.__new__", return_value=mock_chroma):
        yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_state():
    return {
        "domain": "devices",
        "paper_title": "新型荧光探针在早期肿瘤切除手术中的应用",
        "target_department": "肝胆外科",
        "financing_amount": 15.0,
        "clinical_trial_site": "华东地区三甲医院",
        "phase_1_duration": 12,
        "sample_size": 20,
        "excitation_wavelength": 790.0,
        "emission_wavelength": 820.0,
        "metabolic_cycle": 24.0,
        "half_life": 2.4,
        "ld50": 50.0,
        "mtd": 5.0,
        "target": "KRAS-G12C",
        "indication": "非小细胞肺癌",
        "drug_half_life": 12.0,
        "dlt_dose": 400.0,
        "primary_endpoint": "ORR",
        "architecture": "3D-Unet",
        "modality": "MRI-T2WI",
        "accuracy": 92.4,
        "latency": 18.5,
        "integration_standard": "DICOM 3.0",
        "anatomical_site": "胰腺十二指肠区",
        "core_instruments": "腹腔镜能量切割闭合器",
        "learning_curve_cases": 25,
        "safety_endpoint": "30天术后并发症率",
    }
