import type { AppParams } from '../lib/types';

export interface LocalChatResult {
  reply: string;
  nextState: AppParams;
  updated: boolean;
}

const KNOWN_TARGETS = ['EGFR', 'KRAS-G12C', 'PD-L1', 'HER2', 'ALK', 'Claudin 18.2', 'VEGF', 'BRAF'];
const KNOWN_INDICATIONS = ['非小细胞肺癌', '肺腺癌', '胃癌', '结直肠癌', '乳腺癌', '胰腺导管腺癌', '胰腺癌', '肝细胞癌'];
const KNOWN_ARCHS = ['3D-Unet+', '3D-Unet', 'Med-Transformer', 'Swin-UNETR', 'nnU-Net'];
const KNOWN_MODALITIES = ['MRI-T2WI', 'MRI-T1ce', 'CT-Chest', 'PET-CT', 'WSI病理切片'];
const KNOWN_SITES = ['胰腺十二指肠区', '肝脏切除区', '胃肠吻合区', '肺段切除区'];
const KNOWN_INSTRUMENTS = ['腹腔镜能量切割闭合器', '超声能量手术刀', '吻合器', '双极电凝镊'];
const KNOWN_SAFETY_ENDPOINTS = ['30天术后并发症率', '90天吻合口瘘率', '术后胆瘘/胰瘘发生率'];

function applyNumericClause(
  clause: string,
  keywords: string[],
  currentVal: number,
  isInt = false,
  percentWhenSmall = false
): number | null {
  const lower = clause.toLowerCase();
  if (!keywords.some((kw) => lower.includes(kw))) return null;

  if (lower.includes('翻倍') || lower.includes('加倍')) {
    const v = currentVal * 2;
    return isInt ? Math.max(1, Math.round(v)) : Number(v.toFixed(2));
  }
  if (lower.includes('减半')) {
    const v = currentVal * 0.5;
    return isInt ? Math.max(1, Math.round(v)) : Number(Math.max(0.01, v).toFixed(2));
  }

  const pctUp = clause.match(/(?:扩大|增加|提高|提升|上调|延长|放大|增长)\s*(\d+(?:\.\d+)?)\s*%/);
  if (pctUp) {
    const pct = parseFloat(pctUp[1]) / 100;
    const v = currentVal * (1 + pct);
    return isInt ? Math.max(1, Math.round(v)) : Number(v.toFixed(2));
  }

  const pctDown = clause.match(/(?:缩小|减少|降低|压低|下降|缩短|下调)\s*(\d+(?:\.\d+)?)\s*%/);
  if (pctDown) {
    const pct = parseFloat(pctDown[1]) / 100;
    const v = Math.max(0.01, currentVal * Math.max(0.05, 1 - pct));
    return isInt ? Math.max(1, Math.round(v)) : Number(v.toFixed(2));
  }

  const hasAbsoluteVerb = /(?:改为|设为|调整为|变更为|设定为|提高到|提升至|降低到|降至)/.test(clause);
  const deltaUp = clause.match(/(?:增加|加上|扩大|延长|提高|提升)\s*(\d+(?:\.\d+)?)(?!\s*%)/);
  if (deltaUp && !hasAbsoluteVerb) {
    const v = currentVal + parseFloat(deltaUp[1]);
    return isInt ? Math.max(1, Math.round(v)) : Number(v.toFixed(2));
  }

  const deltaDown = clause.match(/(?:减少|减去|缩短|降低)\s*(\d+(?:\.\d+)?)(?!\s*%)/);
  if (deltaDown && !hasAbsoluteVerb) {
    const v = Math.max(isInt ? 1 : 0.1, currentVal - parseFloat(deltaDown[1]));
    return isInt ? Math.max(1, Math.round(v)) : Number(v.toFixed(2));
  }

  const nums = clause.match(/\d+(?:\.\d+)?/g);
  if (nums && nums.length > 0) {
    let val = parseFloat(nums[nums.length - 1]);
    if (percentWhenSmall && val <= 1.0) val *= 100;
    return isInt ? Math.max(1, Math.round(val)) : Number(val.toFixed(2));
  }
  return null;
}

export function processLocalChatCommand(userMsg: string, state: AppParams): LocalChatResult {
  const nextState: AppParams = { ...state };
  const notes: string[] = [];

  const clauses = userMsg
    .split(/[，,。；;\n]+|(?:\s+同时\s*|\s+并且\s*|\s+并\s+)/)
    .map((c) => c.trim())
    .filter(Boolean);
  const activeClauses = clauses.length > 0 ? clauses : [userMsg];

  for (const clause of activeClauses) {
    const lower = clause.toLowerCase();

    // 1. Department
    if (['科室', '部门', '外科', '放射科', '肿瘤内'].some((k) => lower.includes(k))) {
      let matchedDept: string | null = null;
      if (lower.includes('脑') || lower.includes('神经')) matchedDept = '脑外科/神经外科';
      else if (lower.includes('泌尿')) matchedDept = '泌尿外科';
      else if (lower.includes('肝')) matchedDept = '肝胆外科';
      else if (lower.includes('放射')) matchedDept = '放射科';
      else if (lower.includes('肿瘤内') || lower.includes('内科')) matchedDept = '肿瘤内科';
      else if (lower.includes('普通外科') || lower.includes('普外')) matchedDept = '普通外科';
      else {
        const m = clause.match(/(?:目标科室|就诊科室|科室|部门)\s*(?:改为|设为|调整为|变更为|换为|是|：|:)\s*([^\s，,。；;]{2,16})/);
        if (m) matchedDept = m[1].trim();
      }
      if (matchedDept && matchedDept !== nextState.target_department) {
        nextState.target_department = matchedDept;
        notes.push(`目标临床科室 → **${matchedDept}**`);
      }
    }

    // 2. Financing
    if (['融资', '额度', '金额', '经费', '预算'].some((k) => lower.includes(k))) {
      let newFin: number | null = null;
      if (lower.includes('翻倍') || lower.includes('加倍')) {
        newFin = Number((nextState.financing_amount * 2).toFixed(2));
      } else if (lower.includes('减半')) {
        newFin = Number(Math.max(0.5, nextState.financing_amount * 0.5).toFixed(2));
      } else if (lower.includes('%')) {
        newFin = applyNumericClause(clause, ['融资', '额度', '金额', '经费', '预算'], nextState.financing_amount);
      } else {
        const nums = lower.match(/\d+(?:\.\d+)?/g);
        if (nums && nums.length > 0) {
          const val = parseFloat(nums[nums.length - 1]);
          if (lower.includes('千万')) newFin = Number((val * 10).toFixed(2));
          else if (lower.includes('万')) newFin = Number((val / 100).toFixed(2));
          else if (lower.includes('亿')) newFin = Number((val * 100).toFixed(2));
          else newFin = Number(val.toFixed(2));
        }
      }
      if (newFin !== null && newFin > 0 && newFin !== nextState.financing_amount) {
        nextState.financing_amount = newFin;
        notes.push(`商业融资金额 → **${Math.round(newFin * 100)} 万元**`);
      }
    }

    // 3. Clinical trial site
    if (['医院', '基地', '中心', '协和', '中山', '临床点'].some((k) => lower.includes(k))) {
      let newSite: string | null = null;
      if (lower.includes('华北') || lower.includes('北京协和') || (lower.includes('协和') && !lower.includes('武汉'))) {
        newSite = '北京协和医院(GCP基地)';
      } else if (lower.includes('华东') || lower.includes('上海中山') || lower.includes('中山医院')) {
        newSite = '华东地区三甲医院(上海中山医院等)';
      } else if (lower.includes('华南') || lower.includes('广州') || lower.includes('中山大学')) {
        newSite = '华南地区三甲医院(中山大学附属医院等)';
      } else {
        const m = clause.match(/(?:临床试验基地|临床基地|试验基地|医院|基地|中心)\s*(?:改为|设为|调整为|变更为|换到|到|至|是|：|:)\s*([^\s，,。；;]{2,28})/);
        if (m) newSite = m[1].trim();
      }
      if (newSite && newSite !== nextState.clinical_trial_site) {
        nextState.clinical_trial_site = newSite;
        notes.push(`临床试验基地 → **${newSite}**`);
      }
    }

    // 4. Universal sample_size & phase_1_duration
    const newSampleSize = applyNumericClause(
      clause,
      ['样本', '受试者', '入组', '患者数', '队列规模'],
      nextState.sample_size,
      true
    );
    if (newSampleSize !== null && newSampleSize !== nextState.sample_size) {
      nextState.sample_size = newSampleSize;
      notes.push(`样本规模 → **${newSampleSize} 例**`);
    }

    const newDuration = applyNumericClause(
      clause,
      ['周期', '月数', '试验时长', '研究周期'],
      nextState.phase_1_duration,
      true
    );
    if (newDuration !== null && newDuration !== nextState.phase_1_duration) {
      nextState.phase_1_duration = newDuration;
      notes.push(`试验周期 → **${newDuration} 个月**`);
    }

    // 5. Open-vocabulary target & indication
    if (lower.includes('靶点') || lower.includes('target')) {
      let matchedTarget = KNOWN_TARGETS.find((t) => lower.includes(t.toLowerCase())) || null;
      if (!matchedTarget) {
        const m = clause.match(
          /(?:治疗靶点|新药靶点|靶点|target)\s*(?:改为|设为|调整为|变更为|换为|更换为|是|：|:)\s*([A-Za-z0-9_\-.\u4e00-\u9fa5][A-Za-z0-9_\-.\s\u4e00-\u9fa5]{1,28})/i
        );
        if (m) matchedTarget = m[1].trim();
      }
      if (matchedTarget && matchedTarget !== nextState.target) {
        nextState.target = matchedTarget;
        notes.push(`治疗靶点 → **${matchedTarget}**`);
      }
    }

    if (['适应症', '针对疾病', '瘤种', '癌'].some((k) => lower.includes(k))) {
      let matchedInd: string | null = null;
      const m = clause.match(
        /(?:目标适应症|适应症|针对疾病|瘤种)\s*(?:改为|设为|调整为|变更为|换为|更换为|是|：|:)\s*([^\s，,。；;]{2,24})/
      );
      if (m) matchedInd = m[1].trim();
      else matchedInd = KNOWN_INDICATIONS.find((ind) => clause.includes(ind)) || null;
      if (matchedInd && matchedInd !== nextState.indication) {
        nextState.indication = matchedInd;
        notes.push(`目标适应症 → **${matchedInd}**`);
      }
    }

    // 6. Half-life, DLT, endpoints
    if (lower.includes('半衰期') || lower.includes('消除')) {
      if (nextState.domain === 'drugs' || lower.includes('血浆') || lower.includes('新药') || lower.includes('药物')) {
        const v = applyNumericClause(clause, ['半衰期', '消除'], nextState.drug_half_life);
        if (v !== null && v !== nextState.drug_half_life) {
          nextState.drug_half_life = v;
          notes.push(`血浆消除半衰期 → **${v} h**`);
        }
      } else {
        const v = applyNumericClause(clause, ['半衰期', '消除'], nextState.half_life);
        if (v !== null && v !== nextState.half_life) {
          nextState.half_life = v;
          notes.push(`半衰期 T₁/₂ → **${v} h**`);
        }
      }
    }

    const newDlt = applyNumericClause(clause, ['限制毒性', 'dlt'], nextState.dlt_dose);
    if (newDlt !== null && newDlt !== nextState.dlt_dose) {
      nextState.dlt_dose = newDlt;
      notes.push(`限制毒性剂量 DLT → **${newDlt} mg/m²**`);
    }

    if (lower.includes('终点') || lower.includes('endpoint')) {
      if (lower.includes('安全')) {
        let ep = KNOWN_SAFETY_ENDPOINTS.find((item) => clause.includes(item)) || null;
        if (!ep) {
          const m = clause.match(/(?:安全终点|安全随访终点|终点)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})/);
          if (m) ep = m[1].trim();
        }
        if (ep && ep !== nextState.safety_endpoint) {
          nextState.safety_endpoint = ep;
          notes.push(`临床安全终点 → **${ep}**`);
        }
      } else {
        let ep =
          ['PFS (无进展生存期)', 'ORR (客观缓解率)', 'OS (总生存期)'].find(
            (item) => lower.includes(item.toLowerCase()) || lower.includes(item.split(' ')[0].toLowerCase())
          ) || null;
        if (!ep) {
          const m = clause.match(/(?:主要疗效终点|疗效终点|终点|endpoint)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})/i);
          if (m) ep = m[1].trim();
        }
        if (ep && ep !== nextState.primary_endpoint) {
          nextState.primary_endpoint = ep;
          notes.push(`主要疗效终点 → **${ep}**`);
        }
      }
    }

    // 7. AI parameters
    const newAcc = applyNumericClause(clause, ['准确', '精度', 'auc', 'accuracy'], nextState.accuracy, false, true);
    if (newAcc !== null && newAcc !== nextState.accuracy) {
      nextState.accuracy = Math.min(100, newAcc);
      notes.push(`诊断精度 AUC → **${nextState.accuracy}%**`);
    }

    const newLat = applyNumericClause(clause, ['延迟', '时延', 'latency', 'ms'], nextState.latency);
    if (newLat !== null && newLat !== nextState.latency) {
      nextState.latency = newLat;
      notes.push(`推理延迟 → **${newLat} ms**`);
    }

    if (['架构', '神经网络', '网络模型'].some((k) => lower.includes(k))) {
      let arch = KNOWN_ARCHS.find((a) => lower.includes(a.toLowerCase())) || null;
      if (!arch) {
        const m = clause.match(/(?:架构|神经网络|模型)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([A-Za-z0-9_\-.]{2,24})/);
        if (m) arch = m[1].trim();
      }
      if (arch && arch !== nextState.architecture) {
        nextState.architecture = arch;
        notes.push(`算法架构 → **${arch}**`);
      }
    }

    if (['模态', '影像模态', '图像模态'].some((k) => lower.includes(k))) {
      let mod = KNOWN_MODALITIES.find((m) => lower.includes(m.toLowerCase())) || null;
      if (!mod) {
        const m = clause.match(/(?:影像模态|模态)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([A-Za-z0-9_\-\u4e00-\u9fa5]{2,20})/);
        if (m) mod = m[1].trim();
      }
      if (mod && mod !== nextState.modality) {
        nextState.modality = mod;
        notes.push(`影像模态 → **${mod}**`);
      }
    }

    // 8. Surgical parameters
    const newCases = applyNumericClause(clause, ['学习曲线', '带教例数', '例数'], nextState.learning_curve_cases, true);
    if (newCases !== null && newCases !== nextState.learning_curve_cases) {
      nextState.learning_curve_cases = newCases;
      notes.push(`学习曲线例数 → **${newCases} 例**`);
    }

    if (lower.includes('部位') || lower.includes('解剖')) {
      let site = KNOWN_SITES.find((s) => clause.includes(s)) || null;
      if (!site) {
        const m = clause.match(/(?:解剖部位|手术部位|部位)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,20})/);
        if (m) site = m[1].trim();
      }
      if (site && site !== nextState.anatomical_site) {
        nextState.anatomical_site = site;
        notes.push(`目标解剖部位 → **${site}**`);
      }
    }

    if (['手术器械', '核心器械', '器械'].some((k) => lower.includes(k))) {
      let inst = KNOWN_INSTRUMENTS.find((i) => clause.includes(i)) || null;
      if (!inst) {
        const m = clause.match(/(?:核心器械|手术器械|器械)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})/);
        if (m) inst = m[1].trim();
      }
      if (inst && inst !== nextState.core_instruments) {
        nextState.core_instruments = inst;
        notes.push(`核心手术器械 → **${inst}**`);
      }
    }

    // 9. Devices parameters
    const newExc = applyNumericClause(clause, ['激发波长', '波长'], nextState.excitation_wavelength);
    if (newExc !== null && newExc >= 400 && newExc <= 1800 && newExc !== nextState.excitation_wavelength) {
      nextState.excitation_wavelength = newExc;
      nextState.emission_wavelength = Number((newExc + 30).toFixed(1));
      notes.push(`激发波长 → **${newExc} nm**（发射波长同步为 **${nextState.emission_wavelength} nm**）`);
    }

    const newEmi = applyNumericClause(clause, ['发射波长'], nextState.emission_wavelength);
    if (newEmi !== null && newEmi >= 400 && newEmi <= 2000 && newEmi !== nextState.emission_wavelength) {
      nextState.emission_wavelength = newEmi;
      notes.push(`发射波长 → **${newEmi} nm**`);
    }

    const newMc = applyNumericClause(clause, ['代谢周期', '清除时间'], nextState.metabolic_cycle);
    if (newMc !== null && newMc !== nextState.metabolic_cycle) {
      nextState.metabolic_cycle = newMc;
      notes.push(`完全代谢周期 → **${newMc} h**`);
    }

    const newLd50 = applyNumericClause(clause, ['ld50', '半数致死量'], nextState.ld50);
    if (newLd50 !== null && newLd50 !== nextState.ld50) {
      nextState.ld50 = newLd50;
      notes.push(`半数致死量 LD₅₀ → **${newLd50} mg/kg**`);
    }

    const newMtd = applyNumericClause(clause, ['mtd', '最大耐受剂量'], nextState.mtd);
    if (newMtd !== null && newMtd !== nextState.mtd) {
      nextState.mtd = newMtd;
      notes.push(`最大耐受剂量 MTD → **${newMtd} mg/kg**`);
    }
  }

  const updated = notes.length > 0;
  const reply = updated
    ? `已同步更新以下转化参数：\n${notes.map((n) => `- ${n}`).join('\n')}\n\n下游场景匹配权重、动力学曲线与临床/商业文档已同步刷新。`
    : '支持直接下达复合参数微调与相对缩放指令，例如：\n• “把靶点改为 Claudin 18.2，适应症改为胰腺导管腺癌，样本量扩大 50%”\n• “融资额度调整为 3000 万，临床基地改为北京协和医院”\n• “激发波长改为 800nm，准确率提升至 95%，推理延迟降低 20%”';

  return { reply, nextState, updated };
}
