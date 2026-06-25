def test_analyze_paper_mock(client):
    payload = {
        "title": "新型荧光探针在早期肿瘤切除手术中的应用",
        "content": "本文研究了一种新型近红外荧光探针，用于早期肿瘤切除手术中的术中导航成像，激发波长790nm，发射波长820nm。",
    }
    response = client.post("/api/analyze-paper", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["is_valid"] is True
    assert "state" in data


def test_analyze_paper_invalid(client):
    payload = {
        "title": "浅谈现代建筑美学",
        "content": "本文从建筑美学角度探讨了现代城市建筑的设计理念与审美趋势。",
    }
    response = client.post("/api/analyze-paper", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "warning"
    assert data["is_valid"] is False


def test_analyze_paper_drugs_domain(client):
    payload = {
        "title": "KRAS-G12C抑制剂在非小细胞肺癌中的临床研究",
        "content": "本研究评估了一种新型靶向药物KRAS-G12C抑制剂在非小细胞肺癌患者中的疗效与安全性，药物半衰期12小时。",
    }
    response = client.post("/api/analyze-paper", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["state"]["domain"] == "drugs"


def test_analyze_paper_ai_domain(client):
    payload = {
        "title": "基于3D-Unet的医学影像分割算法研究",
        "content": "本文提出了一种基于深度学习的医学影像分割算法，采用3D-Unet架构，在MRI影像上实现了92%的分割精度。",
    }
    response = client.post("/api/analyze-paper", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["state"]["domain"] == "ai"


def test_analyze_paper_surgical_domain(client):
    payload = {
        "title": "腹腔镜微创手术改良术式在胰腺切除中的应用",
        "content": "本文研究了一种新型腹腔镜微创切除术式，在胰腺十二指肠切除术中缩短了手术时间和学习曲线。",
    }
    response = client.post("/api/analyze-paper", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["state"]["domain"] == "surgical"
