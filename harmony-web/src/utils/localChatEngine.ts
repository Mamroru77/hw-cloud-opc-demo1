import type { AppParams } from '../lib/types';

export interface LocalChatResult {
  reply: string;
  nextState: AppParams;
  updated: boolean;
}

export function processLocalChatCommand(userMsg: string, state: AppParams): LocalChatResult {
  let reply = '';
  const nextState: AppParams = { ...state };
  const msg = userMsg.toLowerCase();
  let updated = false;

  // Department
  if (msg.includes('科室') || msg.includes('部门') || msg.includes('脑外科') || msg.includes('肝胆') || msg.includes('泌尿') || msg.includes('肿瘤内科') || msg.includes('放射科') || msg.includes('普外')) {
    if (msg.includes('脑') || msg.includes('神经')) {
      nextState.target_department = '脑外科/神经外科';
      reply = '已将目标临床科室修改为 **脑外科/神经外科**，并同步重算场景匹配与临床文档。';
      updated = true;
    } else if (msg.includes('泌尿')) {
      nextState.target_department = '泌尿外科';
      reply = '已将目标临床科室修改为 **泌尿外科**，并同步更新适配权重。';
      updated = true;
    } else if (msg.includes('肝')) {
      nextState.target_department = '肝胆外科';
      reply = '已将目标临床科室修改为 **肝胆外科**，相关匹配与临床方案已同步刷新。';
      updated = true;
    } else if (msg.includes('放射')) {
      nextState.target_department = '放射科';
      reply = '已将目标诊断科室变更为 **放射科**。';
      updated = true;
    } else if (msg.includes('内科') || msg.includes('肿瘤内')) {
      nextState.target_department = '肿瘤内科';
      reply = '已将临床就诊科室变更为 **肿瘤内科**。';
      updated = true;
    } else if (msg.includes('普通外科') || msg.includes('普外')) {
      nextState.target_department = '普通外科';
      reply = '已将临床就诊科室变更为 **普通外科**。';
      updated = true;
    }
  }

  // Financing
  if (msg.includes('融资') || msg.includes('额度') || msg.includes('金额') || msg.includes('万') || msg.includes('亿')) {
    const numbers = msg.match(/\d+(?:\.\d+)?/);
    if (numbers) {
      const val = parseFloat(numbers[0]);
      let actualVal = val;
      if (msg.includes('万')) {
        actualVal = val / 100.0;
      } else if (msg.includes('亿')) {
        actualVal = val * 10.0;
      } else {
        actualVal = val > 1.0 ? val : val * 100.0;
      }
      nextState.financing_amount = actualVal;
      reply += `${reply ? '\n' : ''}已将融资额度调整为 **${Math.round(actualVal * 100)} 万元人民币**，商业计划书资金分配已同步更新。`;
      updated = true;
    }
  }

  // Sites
  if (msg.includes('医院') || msg.includes('基地') || msg.includes('中心') || msg.includes('协和') || msg.includes('中山')) {
    if (msg.includes('华北') || msg.includes('北京') || msg.includes('协和')) {
      nextState.clinical_trial_site = '北京协和医院(GCP基地)';
      reply += `${reply ? '\n' : ''}临床试验基地已变更为 **北京协和医院(GCP基地)**。`;
      updated = true;
    } else if (msg.includes('华东') || msg.includes('上海') || msg.includes('中山医院')) {
      nextState.clinical_trial_site = '华东地区三甲医院(上海中山医院等)';
      reply += `${reply ? '\n' : ''}临床试验基地已变更为 **华东地区三甲医院(上海中山医院等)**。`;
      updated = true;
    } else if (msg.includes('华南') || msg.includes('广州') || msg.includes('中山大学')) {
      nextState.clinical_trial_site = '华南地区三甲医院(中山大学附属医院等)';
      reply += `${reply ? '\n' : ''}临床试验基地已变更为 **华南地区三甲医院(中山大学附属医院等)**。`;
      updated = true;
    }
  }

  // Domain-specific parameters
  if (nextState.domain === 'drugs') {
    if (msg.includes('靶点') || msg.includes('target') || msg.includes('egfr') || msg.includes('pd-l1') || msg.includes('her2')) {
      for (const t of ['EGFR', 'KRAS-G12C', 'PD-L1', 'HER2', 'ALK']) {
        if (msg.includes(t.toLowerCase())) {
          nextState.target = t;
          reply += `${reply ? '\n' : ''}已将创新药靶点变更为 **${t}**。`;
          updated = true;
          break;
        }
      }
    }
    if (msg.includes('适应症') || msg.includes('疾病') || msg.includes('癌')) {
      for (const ind of ['非小细胞肺癌', '胃癌', '结直肠癌', '乳腺癌', '胰腺癌', '肺腺癌']) {
        if (msg.includes(ind)) {
          nextState.indication = ind;
          reply += `${reply ? '\n' : ''}已将目标适应症变更为 **${ind}**。`;
          updated = true;
          break;
        }
      }
    }
    if (msg.includes('半衰期') || msg.includes('消除')) {
      const numbers = msg.match(/\d+(?:\.\d+)?/);
      if (numbers) {
        nextState.drug_half_life = parseFloat(numbers[0]);
        reply += `${reply ? '\n' : ''}已将血浆消除半衰期设定为 **${nextState.drug_half_life} h**。`;
        updated = true;
      }
    }
    if (msg.includes('限制毒性') || msg.includes('dlt')) {
      const numbers = msg.match(/\d+(?:\.\d+)?/);
      if (numbers) {
        nextState.dlt_dose = parseFloat(numbers[0]);
        reply += `${reply ? '\n' : ''}已将限制毒性剂量 DLT 调整为 **${nextState.dlt_dose} mg/m²**。`;
        updated = true;
      }
    }
    if (msg.includes('终点') || msg.includes('疗效') || msg.includes('pfs') || msg.includes('orr')) {
      for (const ep of ['PFS (无进展生存期)', 'ORR (客观缓解率)', 'OS (总生存期)']) {
        if (msg.includes(ep.split(' ')[0].toLowerCase())) {
          nextState.primary_endpoint = ep;
          reply += `${reply ? '\n' : ''}已将主要疗效终点变更为 **${ep}**。`;
          updated = true;
          break;
        }
      }
    }
  } else if (nextState.domain === 'ai') {
    if (msg.includes('准确') || msg.includes('精度') || msg.includes('auc') || msg.includes('accuracy')) {
      const numbers = msg.match(/\d+(?:\.\d+)?/);
      if (numbers) {
        const val = parseFloat(numbers[0]);
        nextState.accuracy = val > 1.0 ? val : val * 100.0;
        reply += `${reply ? '\n' : ''}已将 SaMD 诊断精度调整为 **${nextState.accuracy}%**，ROC 曲线已刷新。`;
        updated = true;
      }
    }
    if (msg.includes('延迟') || msg.includes('时延') || msg.includes('ms') || msg.includes('latency')) {
      const numbers = msg.match(/\d+(?:\.\d+)?/);
      if (numbers) {
        nextState.latency = parseFloat(numbers[0]);
        reply += `${reply ? '\n' : ''}已将单帧推理时延设定为 **${nextState.latency} ms**。`;
        updated = true;
      }
    }
    if (msg.includes('架构') || msg.includes('网络') || msg.includes('unet') || msg.includes('transformer')) {
      for (const arch of ['3D-Unet+', '3D-Unet', 'Med-Transformer', 'Swin-UNETR']) {
        if (msg.includes(arch.toLowerCase())) {
          nextState.architecture = arch;
          reply += `${reply ? '\n' : ''}已将神经网络架构变更为 **${arch}**。`;
          updated = true;
          break;
        }
      }
    }
    if (msg.includes('模态') || msg.includes('影像') || msg.includes('mri') || msg.includes('ct')) {
      for (const mod of ['MRI-T2WI', 'CT-Chest', 'MRI-T1ce', 'PET-CT']) {
        if (msg.includes(mod.toLowerCase())) {
          nextState.modality = mod;
          reply += `${reply ? '\n' : ''}已将目标影像模态变更为 **${mod}**。`;
          updated = true;
          break;
        }
      }
    }
  } else if (nextState.domain === 'surgical') {
    if (msg.includes('学习曲线') || msg.includes('例数') || msg.includes('例')) {
      const numbers = msg.match(/\d+/);
      if (numbers) {
        nextState.learning_curve_cases = parseInt(numbers[0], 10);
        reply += `${reply ? '\n' : ''}已将学习曲线目标调整为 **${nextState.learning_curve_cases} 例**。`;
        updated = true;
      }
    }
    if (msg.includes('部位') || msg.includes('解剖') || msg.includes('肝脏') || msg.includes('胰')) {
      for (const site of ['胰腺十二指肠区', '肝脏切除区', '胃肠吻合区', '肺段切除区']) {
        if (msg.includes(site) || (site.includes('肝脏') && msg.includes('肝脏'))) {
          nextState.anatomical_site = site;
          reply += `${reply ? '\n' : ''}已将目标解剖部位变更为 **${site}**。`;
          updated = true;
          break;
        }
      }
    }
    if (msg.includes('器械') || msg.includes('超声') || msg.includes('吻合器')) {
      for (const inst of ['腹腔镜能量切割闭合器', '超声能量手术刀', '吻合器', '双极电凝镊']) {
        if (msg.includes(inst)) {
          nextState.core_instruments = inst;
          reply += `${reply ? '\n' : ''}已将核心手术器械配置变更为 **${inst}**。`;
          updated = true;
          break;
        }
      }
    }
    if (msg.includes('安全终点') || msg.includes('并发症') || msg.includes('瘘')) {
      for (const ep of ['30天术后并发症率', '90天吻合口瘘率', '术后胆瘘/胰瘘发生率']) {
        if (msg.includes(ep)) {
          nextState.safety_endpoint = ep;
          reply += `${reply ? '\n' : ''}已将安全终点指标设定为 **${ep}**。`;
          updated = true;
          break;
        }
      }
    }
  } else {
    if (msg.includes('激发波长') || msg.includes('波长') || msg.includes('nm')) {
      const numbers = msg.match(/\d+/);
      if (numbers) {
        const val = parseInt(numbers[0], 10);
        if (val >= 700 && val <= 900) {
          nextState.excitation_wavelength = val;
          nextState.emission_wavelength = val + 30;
          reply += `${reply ? '\n' : ''}已将激发波长设定为 **${val} nm**，发射波长自动同步为 **${val + 30} nm**。`;
          updated = true;
        }
      }
    }
    if (msg.includes('半衰期')) {
      const numbers = msg.match(/\d+(?:\.\d+)?/);
      if (numbers) {
        nextState.half_life = parseFloat(numbers[0]);
        reply += `${reply ? '\n' : ''}已将排泄半衰期调整为 **${nextState.half_life} h**。`;
        updated = true;
      }
    }
  }

  if (!reply) {
    reply =
      '支持直接下达参数微调指令，例如：\n• 修改目标科室（如“改为脑外科”）\n• 调整融资金额与基地（如“融资额度调整为 3000 万，基地改为北京协和医院”）\n• 调整领域核心参数（如“激发波长改为 800nm”、“准确率提升至 95%”、“学习曲线改为 15 例”）';
  }

  return { reply, nextState, updated };
}
