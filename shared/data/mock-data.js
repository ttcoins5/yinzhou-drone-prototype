(function () {
  const now = '2026-07-30';
  const yinzhouStreets = [
    '百丈街道', '东胜街道', '明楼街道', '白鹤街道', '东柳街道', '中河街道',
    '下应街道', '钟公庙街道', '首南街道', '潘火街道', '福明街道', '东郊街道',
    '邱隘镇', '五乡镇', '云龙镇', '古林镇', '石碶镇', '横溪镇', '姜山镇',
    '洞桥镇', '鄞江镇', '章水镇', '龙观乡'
  ];
  const normalizePersonalSupplement = (supplement = {}) => {
    let district = String(supplement.district || '').trim();
    if (!district && supplement.usualArea) {
      district = yinzhouStreets.find((street) => String(supplement.usualArea).includes(street)) || '';
    }
    if (district && !yinzhouStreets.includes(district)) district = '';
    return {
      district,
      emergencyContact: String(supplement.emergencyContact || ''),
      emergencyPhone: String(supplement.emergencyPhone || '')
    };
  };
  window.LowAltitudeMock = {
    now,
    yinzhouStreets,
    normalizePersonalSupplement,
    profiles: {
      personal: { label: '个人用户', name: '陈先生（演示）', idNumber: '3302**********0412', verified: '已实名认证', syncState: '已同步', license: '未上传', licenseFileName: '', phone: '138****2408', address: '鄞州区（示例地址）', devices: 2, affiliatedCompany: '鄞州云航服务有限公司（演示）', supplement: { district: '下应街道', emergencyContact: '陈女士（演示）', emergencyPhone: '139****6120' } },
      company: { label: '法人用户', name: '鄞州云航服务有限公司（演示）', creditCode: '9133**********8X', verified: '已认证', syncState: '已同步', supplementState: '已完善', contact: '王女士（演示）', phone: '139****1682', devices: 5, supplement: { droneUsage: '巡检、航拍影像、安防巡查服务（演示）', safetyOfficer: '周先生（演示）', safetyPhone: '137****5026' } }
    },
    companyMembers: [
      { id: 'MEM-01', name: '王女士（演示）', relation: '法定代表人', phone: '139****1682', state: '正常', isAdmin: true, isPilot: true, license: '已上传', assignedDroneIds: ['DR-003'] },
      { id: 'MEM-02', name: '周先生（演示）', relation: '授权经办人', phone: '137****5026', state: '正常', isAdmin: false, isPilot: true, license: '已上传', assignedDroneIds: ['DR-004'] },
      { id: 'MEM-03', name: '赵先生（演示）', relation: '安全负责人', phone: '136****8831', state: '正常', isAdmin: false, isPilot: false, license: '未上传', assignedDroneIds: [] },
      { id: 'MEM-04', name: '孙先生（演示）', relation: '授权经办人', phone: '135****4419', state: '正常', isAdmin: false, isPilot: true, license: '已上传', assignedDroneIds: ['DR-006'] },
      { id: 'MEM-05', name: '钱女士（演示）', relation: '授权经办人', phone: '134****7720', state: '正常', isAdmin: false, isPilot: true, license: '已上传', assignedDroneIds: ['DR-007'] },
      { id: 'MEM-06', name: '郑先生（演示）', relation: '授权经办人', phone: '133****9055', state: '已停用', isAdmin: false, isPilot: false, license: '未上传', assignedDroneIds: [] }
    ],
    uomCertificateFields: [
      ['registrationMark', '登记标志'],
      ['manufacturerModel', '航空器型号和制造人'],
      ['serialNumber', '序号'],
      ['aircraftName', '产品名称'],
      ['emptyWeight', '空机重量'],
      ['maxTakeoffWeight', '最大起飞重量'],
      ['aircraftType', '类型'],
      ['issuedTo', '本证发给'],
      ['mobilePhone', '联系手机'],
      ['registrationStatus', '状态'],
      ['registrationDate', '注册日期']
    ],
    uomDroneFields: [
      ['registrationMark', '登记标志'],
      ['manufacturerModel', '航空器型号和制造人'],
      ['serialNumber', '序号'],
      ['aircraftName', '产品名称'],
      ['emptyWeight', '空机重量'],
      ['maxTakeoffWeight', '最大起飞重量'],
      ['aircraftType', '类型'],
      ['registrationStatus', '登记状态'],
      ['registrationDate', '注册日期']
    ],
    uomValue(item, field) {
      const fallback = {
        manufacturerModel: item.model || item.drone || '—',
        serialNumber: item.sn || '—',
        aircraftName: item.drone || item.model || '—',
        issuedTo: item.holder || '—',
        registrationStatus: item.state === '已注销' ? '已注销' : (item.certificate ? '有效' : '待关联'),
        registrationDate: item.updated || '—'
      };
      const value = item[field] ?? fallback[field] ?? '—';
      return value === '' || value == null ? '—' : value;
    },
    certificateOcr: {
      registrationMark: 'UAS03****03',
      manufacturerModel: 'QF2W4K / 深圳市某科技有限公司',
      serialNumber: '15814QWB****0411',
      aircraftName: 'DJI Avata',
      emptyWeight: '0.41 kg',
      maxTakeoffWeight: '0.41 kg',
      aircraftType: '多桨或多轴航空器',
      issuedTo: '鄞州某科技有限公司',
      mobilePhone: '130****4531',
      registrationStatus: '有效',
      registrationDate: '2024-01-25'
    },
    policeOfficers: [
      { id: 'PO-001', name: '张警官', unit: '首南派出所' },
      { id: 'PO-002', name: '李警官', unit: '钟公庙派出所' },
      { id: 'PO-003', name: '王警官', unit: '下应派出所' },
      { id: 'PO-004', name: '赵警官', unit: '巡特警大队' }
    ],
    drones: [
      { id: 'DR-001', model: '云翼 M30（演示）', sn: 'SN-****-0192', registrationMark: 'UAS03****81', manufacturerModel: 'M30 / 某制造商', serialNumber: 'SN-****-0192', aircraftName: '云翼 M30（演示）', emptyWeight: '3.77 kg', maxTakeoffWeight: '3.77 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-22', owner: '个人持有', group: '持有设备', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-81', accountRole: 'personal' },
      { id: 'DR-002', model: '巡航 Mini（演示）', sn: 'SN-****-2048', registrationMark: 'UAS03****26', manufacturerModel: 'Mini / 某制造商', serialNumber: 'SN-****-2048', aircraftName: '巡航 Mini（演示）', emptyWeight: '0.25 kg', maxTakeoffWeight: '0.25 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-18', owner: '个人使用', group: '使用设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-26', accountRole: 'personal' },
      { id: 'DR-003', model: '安巡 H20（演示）', sn: 'SN-****-4870', registrationMark: 'UAS03****90', manufacturerModel: 'H20 / 某制造商', serialNumber: 'SN-****-4870', aircraftName: '安巡 H20（演示）', emptyWeight: '1.35 kg', maxTakeoffWeight: '1.35 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-16', owner: '企业使用', group: '使用设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-90', accountRole: 'company' },
      { id: 'DR-004', model: '云巡 S10（演示）', sn: 'SN-****-6612', registrationMark: 'UAS03****12', manufacturerModel: 'S10 / 某制造商', serialNumber: 'SN-****-6612', aircraftName: '云巡 S10（演示）', emptyWeight: '2.10 kg', maxTakeoffWeight: '2.10 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-20', owner: '企业使用', group: '使用设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-12', accountRole: 'company' },
      { id: 'DR-005', model: '旧设备（演示）', sn: 'SN-****-0044', registrationMark: 'UAS03****44', manufacturerModel: '旧设备 / 某制造商', serialNumber: 'SN-****-0044', aircraftName: '旧设备（演示）', emptyWeight: '0.80 kg', maxTakeoffWeight: '0.80 kg', aircraftType: '多旋翼航空器', registrationStatus: '已注销', registrationDate: '2026-06-30', owner: '企业持有', group: '持有设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '已注销', source: 'UOM 登记证自动生成', certificate: 'UOM-****-44', accountRole: 'company' },
      { id: 'DR-006', model: '瞰界 P4（演示）', sn: 'SN-****-8801', registrationMark: 'UAS03****61', manufacturerModel: 'P4 / 某制造商', serialNumber: 'SN-****-8801', aircraftName: '瞰界 P4（演示）', emptyWeight: '1.48 kg', maxTakeoffWeight: '1.48 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-24', owner: '企业使用', group: '使用设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-61', accountRole: 'company' },
      { id: 'DR-007', model: '天目 X3（演示）', sn: 'SN-****-3390', registrationMark: 'UAS03****73', manufacturerModel: 'X3 / 某制造商', serialNumber: 'SN-****-3390', aircraftName: '天目 X3（演示）', emptyWeight: '0.92 kg', maxTakeoffWeight: '0.92 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-26', owner: '企业使用', group: '使用设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-73', accountRole: 'company' },
      { id: 'DR-008', model: '备机 R2（演示）', sn: 'SN-****-5528', registrationMark: 'UAS03****85', manufacturerModel: 'R2 / 某制造商', serialNumber: 'SN-****-5528', aircraftName: '备机 R2（演示）', emptyWeight: '1.10 kg', maxTakeoffWeight: '1.10 kg', aircraftType: '多旋翼航空器', registrationStatus: '有效', registrationDate: '2026-07-28', owner: '企业持有', group: '持有设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '在册', source: 'UOM 登记证自动生成', certificate: 'UOM-****-85', accountRole: 'company' },
      { id: 'DR-009', model: '退役翼龙（演示）', sn: 'SN-****-1107', registrationMark: 'UAS03****19', manufacturerModel: '翼龙 / 某制造商', serialNumber: 'SN-****-1107', aircraftName: '退役翼龙（演示）', emptyWeight: '1.60 kg', maxTakeoffWeight: '1.60 kg', aircraftType: '多旋翼航空器', registrationStatus: '已注销', registrationDate: '2026-06-08', owner: '企业持有', group: '持有设备', ownerCompany: '鄞州云航服务有限公司（演示）', status: '已注销', source: 'UOM 登记证自动生成', certificate: 'UOM-****-19', accountRole: 'company' }
    ],
    certificates: [
      { id: 'UOM-****-81', registrationMark: 'UAS03****81', manufacturerModel: 'M30 / 某制造商', serialNumber: 'SN-****-0192', aircraftName: '云翼 M30（演示）', emptyWeight: '3.77 kg', maxTakeoffWeight: '3.77 kg', aircraftType: '多旋翼航空器', issuedTo: '陈先生（演示）', mobilePhone: '138****2408', registrationStatus: '有效', registrationDate: '2026-07-22', holder: '陈先生（演示）', drone: '云翼 M30（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-22', accountRole: 'personal', history: [{ time: '2026-07-22 10:05', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-26', registrationMark: 'UAS03****26', manufacturerModel: 'Mini / 某制造商', serialNumber: 'SN-****-2048', aircraftName: '巡航 Mini（演示）', emptyWeight: '0.25 kg', maxTakeoffWeight: '0.25 kg', aircraftType: '多旋翼航空器', issuedTo: '陈先生（演示）', mobilePhone: '138****2408', registrationStatus: '有效', registrationDate: '2026-07-18', holder: '陈先生（演示）', drone: '巡航 Mini（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-18', accountRole: 'personal', history: [{ time: '2026-07-12 15:40', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }, { time: '2026-07-18 09:22', action: '更新登记证', detail: '重新上传截图，更新联系手机字段（mock）' }] },
      { id: 'UOM-****-55', registrationMark: 'UAS03****55', manufacturerModel: '退役机 / 某制造商', serialNumber: 'SN-****-0055', aircraftName: '退役机（演示）', emptyWeight: '0.60 kg', maxTakeoffWeight: '0.60 kg', aircraftType: '多旋翼航空器', issuedTo: '陈先生（演示）', mobilePhone: '138****2408', registrationStatus: '已注销', registrationDate: '2026-06-12', holder: '陈先生（演示）', drone: '退役机（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '已注销', updated: '2026-06-12', accountRole: 'personal', history: [{ time: '2026-05-08 09:40', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }, { time: '2026-06-12 14:20', action: '注销登记证', detail: '用户提交注销，关联设备台账同步注销（mock）' }] },
      { id: 'UOM-****-90', registrationMark: 'UAS03****90', manufacturerModel: 'H20 / 某制造商', serialNumber: 'SN-****-4870', aircraftName: '安巡 H20（演示）', emptyWeight: '1.35 kg', maxTakeoffWeight: '1.35 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '有效', registrationDate: '2026-07-16', holder: '鄞州云航服务有限公司（演示）', drone: '安巡 H20（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-16', accountRole: 'company', history: [{ time: '2026-07-16 11:20', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-12', registrationMark: 'UAS03****12', manufacturerModel: 'S10 / 某制造商', serialNumber: 'SN-****-6612', aircraftName: '云巡 S10（演示）', emptyWeight: '2.10 kg', maxTakeoffWeight: '2.10 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '有效', registrationDate: '2026-07-20', holder: '鄞州云航服务有限公司（演示）', drone: '云巡 S10（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-20', accountRole: 'company', history: [{ time: '2026-07-20 09:15', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-44', registrationMark: 'UAS03****44', manufacturerModel: '旧设备 / 某制造商', serialNumber: 'SN-****-0044', aircraftName: '旧设备（演示）', emptyWeight: '0.80 kg', maxTakeoffWeight: '0.80 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '已注销', registrationDate: '2026-06-30', holder: '鄞州云航服务有限公司（演示）', drone: '旧设备（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '已注销', updated: '2026-06-30', accountRole: 'company', history: [{ time: '2026-05-14 11:02', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }, { time: '2026-06-30 16:18', action: '注销登记证', detail: '用户提交注销，关联设备台账同步注销（mock）' }] },
      { id: 'UOM-****-61', registrationMark: 'UAS03****61', manufacturerModel: 'P4 / 某制造商', serialNumber: 'SN-****-8801', aircraftName: '瞰界 P4（演示）', emptyWeight: '1.48 kg', maxTakeoffWeight: '1.48 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '有效', registrationDate: '2026-07-24', holder: '鄞州云航服务有限公司（演示）', drone: '瞰界 P4（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-24', accountRole: 'company', history: [{ time: '2026-07-24 14:08', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-73', registrationMark: 'UAS03****73', manufacturerModel: 'X3 / 某制造商', serialNumber: 'SN-****-3390', aircraftName: '天目 X3（演示）', emptyWeight: '0.92 kg', maxTakeoffWeight: '0.92 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '有效', registrationDate: '2026-07-26', holder: '鄞州云航服务有限公司（演示）', drone: '天目 X3（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-26', accountRole: 'company', history: [{ time: '2026-07-26 10:42', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-85', registrationMark: 'UAS03****85', manufacturerModel: 'R2 / 某制造商', serialNumber: 'SN-****-5528', aircraftName: '备机 R2（演示）', emptyWeight: '1.10 kg', maxTakeoffWeight: '1.10 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '有效', registrationDate: '2026-07-28', holder: '鄞州云航服务有限公司（演示）', drone: '备机 R2（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '有效', updated: '2026-07-28', accountRole: 'company', history: [{ time: '2026-07-28 09:30', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }] },
      { id: 'UOM-****-19', registrationMark: 'UAS03****19', manufacturerModel: '翼龙 / 某制造商', serialNumber: 'SN-****-1107', aircraftName: '退役翼龙（演示）', emptyWeight: '1.60 kg', maxTakeoffWeight: '1.60 kg', aircraftType: '多旋翼航空器', issuedTo: '鄞州云航服务有限公司（演示）', mobilePhone: '139****1682', registrationStatus: '已注销', registrationDate: '2026-06-08', holder: '鄞州云航服务有限公司（演示）', drone: '退役翼龙（演示）', certificateImageUrl: '../../shared/assets/uom-registration-certificate.svg', state: '已注销', updated: '2026-06-08', accountRole: 'company', history: [{ time: '2026-05-20 11:16', action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成设备台账（mock）' }, { time: '2026-06-08 15:40', action: '注销登记证', detail: '用户提交注销，关联设备台账同步注销（mock）' }] }
    ],
    flights: [
      { id: 'FP-20260803-018', title: '鄞州区河道巡检与隐患复核', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-04T08:30', endAt: '2026-08-04T10:00', city: '宁波市鄞州区', street: '下应街道', purpose: '河道沿线巡检与隐患复核', time: '2026-08-04 08:30—10:00', area: '宁波市鄞州区下应街道', drone: '云翼 M30（演示）', operator: '陈先生（演示）', operatorPhone: '138****2408', maxAltitude: '120', takeoffSite: '下应街道河道巡检起降点', owner: '陈先生（演示）', accountRole: 'personal', status: '已登记', executed: '未执行', history: [{ time: '2026-08-03 09:12', action: '新增计划', detail: '提交河道巡检飞行计划（mock）' }] },
      { id: 'FP-20260802-011', title: '社区屋顶安全巡查', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-05T14:00', endAt: '2026-08-05T15:30', city: '宁波市鄞州区', street: '钟公庙街道', purpose: '社区屋顶设施安全巡查', time: '2026-08-05 14:00—15:30', area: '宁波市鄞州区钟公庙街道', drone: '巡航 Mini（演示）', operator: '陈先生（演示）', operatorPhone: '138****2408', maxAltitude: '80', takeoffSite: '金色水岸社区空地', owner: '陈先生（演示）', accountRole: 'personal', status: '已登记', executed: '未执行', history: [{ time: '2026-08-02 11:20', action: '新增计划', detail: '提交社区巡查飞行计划（mock）' }] },
      { id: 'FP-20260801-007', title: '农田灌溉设施巡检', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '自主飞行', startAt: '2026-08-06T09:00', endAt: '2026-08-06T11:00', city: '宁波市鄞州区', street: '姜山镇', purpose: '农田灌溉设施巡检', time: '2026-08-06 09:00—11:00', area: '宁波市鄞州区姜山镇', drone: '安巡 H20（演示）', operator: '王女士（演示）', operatorPhone: '139****1682', maxAltitude: '100', takeoffSite: '姜山镇田间起降场地', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '未执行', history: [{ time: '2026-08-01 15:05', action: '新增计划', detail: '提交农田设施巡检计划（mock）' }] },
      { id: 'FP-20260804-009', title: '园区安防巡查', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-07T08:00', endAt: '2026-08-07T09:30', city: '宁波市鄞州区', street: '首南街道', purpose: '园区安防巡查', time: '2026-08-07 08:00—09:30', area: '宁波市鄞州区首南街道', drone: '云巡 S10（演示）', operator: '周先生（演示）', operatorPhone: '137****5026', maxAltitude: '90', takeoffSite: '首南园区起降点', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '未执行', history: [{ time: '2026-08-04 10:20', action: '新增计划', detail: '提交园区安防巡查计划（mock）' }] },
      { id: 'FP-20260805-014', title: '东钱湖岸线影像采集', activityType: '一般飞行活动', missionNature: '航拍摄影', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-08T07:30', endAt: '2026-08-08T09:00', city: '宁波市鄞州区', street: '东钱湖镇', purpose: '岸线影像采集', time: '2026-08-08 07:30—09:00', area: '宁波市鄞州区东钱湖镇', drone: '瞰界 P4（演示）', operator: '孙先生（演示）', operatorPhone: '135****4419', maxAltitude: '110', takeoffSite: '东钱湖镇岸线备降点', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '未执行', history: [{ time: '2026-08-05 11:08', action: '新增计划', detail: '提交岸线影像采集计划（mock）' }] },
      { id: 'FP-20260805-021', title: '潘火街道工地围挡巡查', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-08T15:00', endAt: '2026-08-08T16:20', city: '宁波市鄞州区', street: '潘火街道', purpose: '工地围挡与物料堆放巡查', time: '2026-08-08 15:00—16:20', area: '宁波市鄞州区潘火街道', drone: '天目 X3（演示）', operator: '钱女士（演示）', operatorPhone: '134****7720', maxAltitude: '80', takeoffSite: '潘火街道工地旁空地', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '未执行', history: [{ time: '2026-08-05 16:40', action: '新增计划', detail: '提交工地围挡巡查计划（mock）' }] },
      { id: 'FP-20260806-003', title: '中河街道夜景照明复核', activityType: '一般飞行活动', missionNature: '航拍摄影', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-09T19:00', endAt: '2026-08-09T20:00', city: '宁波市鄞州区', street: '中河街道', purpose: '夜景照明效果复核', time: '2026-08-09 19:00—20:00', area: '宁波市鄞州区中河街道', drone: '安巡 H20（演示）', operator: '王女士（演示）', operatorPhone: '139****1682', maxAltitude: '70', takeoffSite: '中河街道市民广场旁', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '未执行', history: [{ time: '2026-08-06 09:18', action: '新增计划', detail: '提交夜景照明复核计划（mock）' }] },
      { id: 'FP-20260730-018', title: '邱隘镇仓储屋顶巡检', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '自主飞行', startAt: '2026-07-30T09:00', endAt: '2026-07-30T10:30', city: '宁波市鄞州区', street: '邱隘镇', purpose: '仓储屋顶设施巡检', time: '2026-07-30 09:00—10:30', area: '宁波市鄞州区邱隘镇', drone: '云巡 S10（演示）', operator: '周先生（演示）', operatorPhone: '137****5026', maxAltitude: '95', takeoffSite: '邱隘镇仓储区起降点', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '已确认执行', executedAt: '2026-07-30 10:42', history: [{ time: '2026-07-28 14:22', action: '新增计划', detail: '提交仓储屋顶巡检计划（mock）' }, { time: '2026-07-30 10:42', action: '执行确认', detail: '用户确认已按计划执行（mock）' }] },
      { id: 'FP-20260729-012', title: '下应街道绿化带航拍', activityType: '一般飞行活动', missionNature: '航拍摄影', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-07-29T13:30', endAt: '2026-07-29T14:40', city: '宁波市鄞州区', street: '下应街道', purpose: '绿化带长势航拍', time: '2026-07-29 13:30—14:40', area: '宁波市鄞州区下应街道', drone: '瞰界 P4（演示）', operator: '孙先生（演示）', operatorPhone: '135****4419', maxAltitude: '85', takeoffSite: '下应街道公园空地', owner: '鄞州云航服务有限公司（演示）', accountRole: 'company', status: '已登记', executed: '已确认执行', executedAt: '2026-07-29 14:55', history: [{ time: '2026-07-27 10:05', action: '新增计划', detail: '提交绿化带航拍计划（mock）' }, { time: '2026-07-29 14:55', action: '执行确认', detail: '用户确认已按计划执行（mock）' }] },
      { id: 'FP-20260728-006', title: '场地巡查（演示）', activityType: '一般飞行活动', missionNature: '个人娱乐', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-07-28T14:00', endAt: '2026-07-28T15:00', city: '宁波市鄞州区', street: '首南街道', purpose: '场地巡查', time: '2026-07-28 14:00—15:00', area: '宁波市鄞州区首南街道', drone: '巡航 Mini（演示）', operator: '陈先生（演示）', operatorPhone: '138****2408', maxAltitude: '110', takeoffSite: '首南街道空旷场地', owner: '陈先生（演示）', accountRole: 'personal', status: '已登记', executed: '已确认执行', executedAt: '2026-07-28 15:20', history: [{ time: '2026-07-26 10:30', action: '新增计划', detail: '提交飞行计划（mock）' }, { time: '2026-07-27 08:45', action: '修改计划', detail: '飞行前调整飞行时间段（mock）' }, { time: '2026-07-28 15:20', action: '执行确认', detail: '用户确认已按计划执行（mock）' }] },
      { id: 'FP-20260725-003', title: '道路施工区域影像复核', activityType: '一般飞行活动', missionNature: '航拍摄影', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-07-29T07:30', endAt: '2026-07-29T09:00', city: '宁波市鄞州区', street: '东钱湖镇', purpose: '道路施工区域影像复核', time: '2026-07-29 07:30—09:00', area: '宁波市鄞州区东钱湖镇', drone: '云翼 M30（演示）', operator: '陈先生（演示）', operatorPhone: '138****2408', maxAltitude: '90', takeoffSite: '施工区域旁备降点', owner: '陈先生（演示）', accountRole: 'personal', status: '已登记', executed: '已确认执行', executedAt: '2026-07-29 09:20', history: [{ time: '2026-07-25 10:30', action: '新增计划', detail: '提交施工区域复核计划（mock）' }, { time: '2026-07-29 09:20', action: '执行确认', detail: '用户确认已按计划执行（mock）' }] }
    ],
    flightApprovalOcr: { title: '低空巡查飞行任务（演示）', activityType: '一般飞行活动', missionNature: '巡检巡查', controlMode: '视距内飞行', flightMode: '手动飞行', startAt: '2026-08-02T09:00', endAt: '2026-08-02T11:00', city: '宁波市鄞州区', street: '姜山镇', purpose: '低空巡查', time: '2026-08-02 09:00—11:00', area: '宁波市鄞州区姜山镇', drone: '云翼 M30（演示）', operator: '陈先生（演示）', operatorPhone: '138****2408', maxAltitude: '110', takeoffSite: '姜山镇巡查起降点' },
    activities: [
      { id: 'ACT-01', title: '2026 年鄞州区无人机飞行安全培训', cover: 'training', summary: '面向个人飞手、企业经办人开展实名登记、飞行前检查与风险识别培训。', richText: ['本次培训围绕无人机实名登记、飞行前检查、异常情况报告和文明飞行展开。', '完成现场签到及课程学习后，可在“我的报名”中查看报名状态。'], startTime: '2026-08-08 09:00', endTime: '2026-08-08 11:30', enrollStart: '2026-07-31 09:00', enrollEnd: '2026-08-06 17:00', place: '鄞州区低空安全服务中心一楼培训室', capacity: 60, enrolled: 42, organizer: '鄞州区低空安全服务中心', contact: '服务咨询 0574-****-8612', status: '报名中', confirmState: '未确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-02', title: '夏季低空安全宣传进社区', cover: 'community', summary: '通过案例讲解、设备展示和咨询答疑，普及安全飞行常识。', richText: ['活动设有安全飞行案例展、无人机基础知识咨询和儿童安全科普互动区。', '已报名用户请于活动开始前 15 分钟在现场服务台签到。'], startTime: '2026-08-16 14:00', endTime: '2026-08-16 16:30', enrollStart: '2026-08-01 09:00', enrollEnd: '2026-08-14 17:00', place: '钟公庙街道金色水岸社区文化礼堂', capacity: 80, enrolled: 76, organizer: '钟公庙街道办事处', contact: '活动咨询 0574-****-8096', status: '报名中', confirmState: '未确认', joined: true, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-03', title: '企业无人机合规使用专题沙龙', cover: 'enterprise', summary: '聚焦企业设备台账、授权人员管理和飞行计划填报。', richText: ['活动邀请辖区内使用无人机开展巡检、测绘、影像服务的企业参加。', '请由企业法定代表人或已授权经办人报名，并携带企业登记信息。'], startTime: '2026-08-22 09:30', endTime: '2026-08-22 11:30', enrollStart: '2026-08-05 09:00', enrollEnd: '2026-08-20 17:00', place: '鄞州区政务服务中心 3 号会议室', capacity: 40, enrolled: 18, organizer: '鄞州区低空安全服务中心', contact: '企业咨询 0574-****-8612', status: '进行中', confirmState: '已确认', joined: false, enrollForm: [['企业名称', '文本', '必填', '请填写企业名称', ''], ['联系人', '文本', '必填', '请填写联系人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['参会人数', '下拉框', '选填', '请选择', '1人、2人、3人及以上']] },
      { id: 'ACT-04', title: '青少年无人机科普体验日', cover: 'community', summary: '面向辖区中小学生开展低空安全与设备认知体验活动。', richText: ['活动包含安全知识讲解、模拟操控体验和现场答疑。', '活动已结束，报名与签到记录仅供台账查阅。'], startTime: '2026-07-12 09:00', endTime: '2026-07-12 11:30', enrollStart: '2026-06-20 09:00', enrollEnd: '2026-07-10 17:00', place: '鄞州区青少年宫多功能厅', capacity: 50, enrolled: 50, organizer: '鄞州区低空安全服务中心', contact: '科普咨询 0574-****-8612', status: '已结束', confirmState: '已确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-05', title: '东钱湖低空摄影安全巡讲', cover: 'training', summary: '面向摄影爱好者与航拍从业者开展空域安全与文明飞行巡讲。', richText: ['原定在东钱湖景区周边开展的巡讲因排期调整已下架。', '下架后用户端不再展示该活动，后台可查阅历史配置。'], startTime: '2026-09-05 14:00', endTime: '2026-09-05 16:00', enrollStart: '2026-08-10 09:00', enrollEnd: '2026-09-03 17:00', place: '东钱湖镇文化活动中心', capacity: 45, enrolled: 12, organizer: '东钱湖镇人民政府', contact: '活动咨询 0574-****-7721', status: '已下架', confirmState: '未确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-06', title: '首南街道低空安全入户宣讲', cover: 'community', summary: '走进居民小区普及无人机实名登记与文明飞行要求。', richText: ['宣讲内容包括实名登记路径、适飞空域提示和邻里纠纷防范。', '欢迎辖区居民与无人机爱好者现场咨询。'], startTime: '2026-08-18 09:30', endTime: '2026-08-18 11:00', enrollStart: '2026-08-05 09:00', enrollEnd: '2026-08-16 17:00', place: '首南街道万达社区党群服务中心', capacity: 70, enrolled: 28, organizer: '首南街道办事处', contact: '宣讲咨询 0574-****-6508', status: '报名中', confirmState: '未确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-07', title: '潘火街道飞行计划填报实操课', cover: 'training', summary: '现场演示飞行计划填报、区域确认与执行确认操作。', richText: ['课程以浙里办端填报流程为主，配合案例讲解常见漏填项。', '建议携带已登记设备信息参加。'], startTime: '2026-08-25 14:00', endTime: '2026-08-25 16:00', enrollStart: '2026-08-08 09:00', enrollEnd: '2026-08-23 17:00', place: '潘火街道便民服务中心二楼教室', capacity: 35, enrolled: 19, organizer: '潘火街道办事处', contact: '培训咨询 0574-****-3381', status: '报名中', confirmState: '未确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-08', title: '姜山镇农业植保无人机安全交流会', cover: 'enterprise', summary: '围绕植保作业空域、作业安全与设备台账管理开展交流。', richText: ['面向农业合作社、植保服务企业和乡镇农技人员。', '交流会设置案例分享与现场答疑环节。'], startTime: '2026-08-20 09:00', endTime: '2026-08-20 11:30', enrollStart: '2026-08-01 09:00', enrollEnd: '2026-08-18 17:00', place: '姜山镇便民服务中心多功能厅', capacity: 55, enrolled: 33, organizer: '姜山镇人民政府', contact: '农技咨询 0574-****-2290', status: '进行中', confirmState: '已确认', joined: false, enrollForm: [['单位名称', '文本', '必填', '请填写单位或合作社名称', ''], ['联系人', '文本', '必填', '请填写联系人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-09', title: '下应街道低空应急处置演练观摩', cover: 'training', summary: '观摩肩灯感知、告警处置与现场联动演练流程。', richText: ['演练内容含未报备目标发现、证据留存和推送处置。', '观摩名额有限，请提前报名并按时签到。'], startTime: '2026-08-28 09:00', endTime: '2026-08-28 11:00', enrollStart: '2026-08-10 09:00', enrollEnd: '2026-08-26 17:00', place: '下应街道综治中心演练场', capacity: 40, enrolled: 15, organizer: '下应街道办事处', contact: '演练咨询 0574-****-4176', status: '报名中', confirmState: '未确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['所属单位', '文本', '选填', '选填，可填写单位', '']] },
      { id: 'ACT-10', title: '邱隘镇文明飞行倡议签名活动', cover: 'community', summary: '通过倡议签名、展板讲解推动文明飞行进镇街。', richText: ['现场设置文明飞行倡议墙与咨询台。', '活动结束后倡议记录纳入宣传台账。'], startTime: '2026-07-20 09:00', endTime: '2026-07-20 11:00', enrollStart: '2026-07-05 09:00', enrollEnd: '2026-07-18 17:00', place: '邱隘镇文化广场', capacity: 100, enrolled: 86, organizer: '邱隘镇人民政府', contact: '宣传咨询 0574-****-5820', status: '已结束', confirmState: '已确认', joined: false, enrollForm: [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']] },
      { id: 'ACT-11', title: '中河街道企业飞手岗前安全提示会', cover: 'enterprise', summary: '面向企业新入职飞手讲解登记、申报与现场安全要求。', richText: ['提示会覆盖执照材料、设备检查与飞行计划填报要点。', '请企业安全负责人组织相关飞手参加。'], startTime: '2026-08-12 14:30', endTime: '2026-08-12 16:30', enrollStart: '2026-07-28 09:00', enrollEnd: '2026-08-10 17:00', place: '中河街道党群服务中心会议室', capacity: 48, enrolled: 31, organizer: '中河街道办事处', contact: '安全咨询 0574-****-9063', status: '进行中', confirmState: '已确认', joined: false, enrollForm: [['企业名称', '文本', '必填', '请填写企业名称', ''], ['飞手姓名', '文本', '必填', '请填写飞手姓名', ''], ['联系电话', '手机号', '必填', '请填写手机号', '']] }
    ],
    articles: [
      { id: 'LAW-01', kind: '法规', mediaType: '图文', coverKind: 'image', cover: 'rule', status: '已发布', sort: 1, title: '无人驾驶航空器飞行安全提示', date: '2026-07-21', effectiveStart: '2026-07-21', effectiveEnd: '2027-07-20', effectiveDate: '2026-07-21', summary: '飞行前请完成设备检查、区域确认和必要的飞行计划申报。', source: '鄞州区低空安全服务中心', views: 1286, content: ['无人驾驶航空器飞行活动应当遵守国家有关规定，飞行人员应当依法依规开展飞行。', '请在起飞前核对设备状态、电池电量、飞行区域及天气情况；涉及需申报活动的，请提前完成信息填报。'] },
      { id: 'LAW-02', kind: '法规', mediaType: '视频', coverKind: 'video', cover: 'policy', duration: '03:26', status: '已发布', sort: 2, title: '《无人驾驶航空器飞行管理暂行条例》图解视频', date: '2026-07-18', effectiveStart: '2024-01-01', effectiveEnd: '2029-12-31', effectiveDate: '2024-01-01', summary: '3 分钟视频速览条例中与个人飞手、企业用户相关的重点条款。', source: '鄞州区低空安全服务中心', views: 1730, content: ['视频围绕实名登记、适飞空域、飞行计划申报和法律责任四个部分展开讲解。', '视频内容为法规要点速览，请结合实际飞行场景核对管理要求。'] },
      { id: 'LAW-03', kind: '法规', mediaType: '图文', coverKind: 'image', cover: 'airspace', status: '已发布', sort: 4, title: '低空飞行前的空域与风险核查要点', date: '2026-07-16', effectiveStart: '2026-07-16', effectiveEnd: '2027-07-15', effectiveDate: '2026-07-16', summary: '起飞前应确认飞行区域、时段、周边环境及是否需要自主申报。', source: '鄞州区低空安全服务中心', views: 956, content: ['飞行人员应根据飞行目的、区域环境和设备能力开展风险评估。', '涉及人员密集区域、重要设施周边或其他需重点关注场景时，请提前核查相关要求。'] },
      { id: 'LAW-04', kind: '法规', mediaType: '视频', coverKind: 'video', cover: 'check', duration: '02:12', status: '已发布', sort: 5, title: '一分钟看懂无人机起飞前检查', date: '2026-07-10', effectiveStart: '2026-07-10', effectiveEnd: '2027-07-09', effectiveDate: '2026-07-10', summary: '电池、桨叶、定位、返航点和周边环境五项检查快速讲解。', source: '鄞州区低空安全服务中心', views: 1104, content: ['起飞前请检查机身、螺旋桨、电池与遥控器状态，并确认返航点设置。', '如发现设备异常或天气条件不适宜，请停止起飞并采取安全处置措施。'] },
      { id: 'NEWS-01', kind: '公告', mediaType: '图文', coverKind: 'image', cover: 'community', status: '已发布', sort: 3, title: '2026 年低空安全宣传月活动安排公告', date: '2026-07-30', summary: '八月将开展安全培训、社区宣传和企业合规使用专题活动。', source: '鄞州区低空安全服务中心', views: 862, content: ['为提升无人机用户安全意识，八月将在辖区内陆续开展三场低空安全宣传活动。', '活动报名时间、地点和参与对象以活动详情页发布的信息为准，名额报满后将停止报名。'] },
      { id: 'NEWS-02', kind: '公告', mediaType: '视频', coverKind: 'video', cover: 'weather', duration: '01:48', status: '已发布', sort: 6, title: '夏季无人机飞行安全提示（视频版）', date: '2026-07-25', summary: '高温、强对流天气期间，请加强电池管理并避免在人员密集区域起降。', source: '鄞州区低空安全服务中心', views: 645, content: ['夏季高温、雷雨和强对流天气较多，请密切关注气象预警和飞行环境变化。', '发现设备异常、失控或可能影响公共安全的情况，请立即采取安全措施并联系相关部门。'] },
      { id: 'NEWS-03', kind: '公告', mediaType: '图文', coverKind: 'image', cover: 'service', status: '已发布', sort: 7, title: 'UOM 登记信息归集服务维护提醒', date: '2026-07-23', summary: '登记证图片请保持清晰完整，提交前可核对识别出的设备字段。', source: '鄞州区低空安全服务中心', views: 516, content: ['本服务用于归集已完成实名登记的设备信息，方便用户管理设备台账。', '上传的材料仅用于展示原型中的字段归集效果，实际登记以国家平台要求为准。'] },
      { id: 'NEWS-04', kind: '公告', mediaType: '视频', coverKind: 'video', cover: 'event', duration: '02:35', status: '已发布', sort: 8, title: '低空安全宣传进社区活动回顾', date: '2026-07-19', summary: '通过案例讲解、设备展示和互动答疑普及安全飞行常识。', source: '鄞州区低空安全服务中心', views: 438, content: ['活动现场围绕文明飞行、设备保管和飞行风险识别开展互动讲解。', '后续活动安排请关注新闻公告和活动中心的最新发布信息。'] },
      { id: 'GUIDE-01', kind: '指引', mediaType: '图文', coverKind: 'image', cover: 'guide', status: '已发布', sort: 9, title: 'UOM 登记信息归集操作指引', date: '2026-07-15', summary: '完成国家平台登记后，可在本服务上传登记证图片归集设备台账。', source: '鄞州区低空安全服务中心', views: 2104, content: ['本服务用于归集已完成实名登记的设备信息，便于用户管理台账和填报飞行计划。', '上传的登记证图片仅在当前会话中用于字段提取，确认保存后仅保留脱敏字段。'] }
    ],
    uomGuide: {
      updated: '2026-08-02',
      manualTitle: '飞行活动自主申报操作手册',
      manualRichText: '飞行活动自主申报用于向 UOM 平台提交个人或企业的飞行安排。请先完成账号实名认证和航空器登记，再进入“飞行活动自主申报”页面，按页面提示填写飞行活动信息并提交。\n\n填写时请重点核对开始时间、结束时间、飞行区域、飞行目的、飞行设备和现场联系人；区域固定为宁波市鄞州区，街道信息按实际情况手工填写。提交后可在“我的申报”中查询处理结果，修改或撤销请以平台实时入口为准。',
      manualImage: '../../shared/assets/flight-self-declaration-guide.svg',
      guides: [
        { id: 'GUIDE-01', title: '飞行活动自主申报', summary: '从选择航空器到提交飞行活动信息的流程说明。', mediaType: '图文', richText: '## 申报准备\n请先完成账号实名认证和航空器登记，再进入“飞行活动自主申报”页面。\n\n## 填写步骤\n- 选择已登记航空器\n- 填写开始时间、结束时间与飞行区域\n- 补充飞行目的、设备与现场联系人\n- 核对后提交申报\n\n[图文说明]\n示意图：申报表单核对页，重点核对照开始结束时间、鄞州区街道与通信联络方式。\n\n## 后续查询\n提交后可在“我的申报”中查看处理结果；修改或撤销请以平台实时入口为准。', status: '已下架', sort: 1, updated: '2026-07-30' },
        { id: 'GUIDE-02', title: '航空器登记信息维护', summary: '登记证信息更新与设备台账核对流程说明。', mediaType: '图文', richText: '## 适用场景\n登记证信息变更、设备台账核对，或需要同步更新登记状态时，按下列步骤操作。\n\n## 操作步骤\n- 登录 UOM 平台，进入航空器 / 登记信息维护\n- 选择待更新的航空器记录\n- 上传清晰登记证图片，核对登记标志、型号、序号与登记状态\n- 确认无误后提交，并在结果页查看更新状态\n\n[图文说明]\n示意图：登记证字段核对界面，请逐项比对登记标志、航空器型号、序号、产品名称与登记状态。\n\n## 注意事项\n- 图片须完整清晰，避免反光遮挡关键字段\n- 选择“已注销”将同步影响关联设备台账\n- 本服务仅归集脱敏后的证载信息，不保存真实凭证原件', status: '已发布', sort: 2, updated: '2026-08-02' },
        { id: 'GUIDE-03', title: '飞行申报结果查询', summary: '查询申报记录、处理状态与后续操作流程说明。', mediaType: '图文', richText: '## 查询入口\n进入 UOM 平台“我的申报”，按计划名称、时间或处理状态筛选记录。\n\n## 查询步骤\n- 打开“我的申报”列表\n- 定位目标申报记录并查看处理状态\n- 如需调整，按页面提供的修改或撤销入口办理\n- 办理完成后刷新列表确认最新状态\n\n[图文说明]\n示意图：申报结果列表页，展示计划名称、预计时段、处理状态与可操作入口。\n\n## 常见状态\n- 待处理：已提交，等待平台反馈\n- 已通过：可按计划执行并做好现场联络\n- 已退回：按退回说明修改后重新提交', status: '已发布', sort: 3, updated: '2026-08-02' }
      ],
      faqs: [
        { id: 'FAQ-01', question: '什么情况下需要进行飞行活动自主申报？', answer: '## 申报判断\n请根据实际飞行场景和 UOM 平台页面提示判断是否需要申报，并以平台最新规则为准。\n\n[图文说明]\n图片要点：起飞前核对飞行区域、时段和平台提示。', mediaType: '图文', updated: '2026-08-02', status: '已发布', sort: 1 },
        { id: 'FAQ-02', question: '飞行区域无法选择或填写有误怎么办？', answer: '## 先核对填写信息\n请核对区域名称、飞行时间和页面限制提示；必要时调整计划后重新提交。\n\n- 核对区域名称\n- 检查飞行时间\n- 按页面提示处理', mediaType: '图文', updated: '2026-08-02', status: '已发布', sort: 2 },
        { id: 'FAQ-03', question: '提交后还能修改申报信息吗？', answer: '## 查看当前申报状态\n请进入 UOM 平台“我的申报”查看当前状态，并按页面提供的修改或撤销入口办理。', mediaType: '图文', updated: '2026-08-02', status: '已发布', sort: 3 },
        { id: 'FAQ-04', question: '申报信息需要提前多久填写？', answer: '请以 UOM 平台页面展示的时限和实际飞行场景为准，避免临近起飞时才提交。', mediaType: '图文', updated: '2026-08-01', status: '已发布', sort: 4 },
        { id: 'FAQ-05', question: '企业账号可以代为填写飞行计划吗？', answer: '企业用户请按平台对申报主体、航空器和操作人员的页面提示完成信息核对。', mediaType: '图文', updated: '2026-08-01', status: '已发布', sort: 5 },
        { id: 'FAQ-06', question: '页面提示信息不完整怎么办？', answer: '请先保存当前已填写内容，按页面提示补齐必填项；具体口径以平台最新规则为准。', mediaType: '图文', updated: '2026-07-31', status: '已发布', sort: 6 },
        { id: 'FAQ-07', question: '可以上传哪些附件材料？', answer: '附件材料范围以 UOM 平台当前页面要求为准；本静态原型不上传真实材料。', mediaType: '图文', updated: '2026-07-31', status: '已下架', sort: 7 }
      ]
    },
    feedbacks: [
      { id: 'FB-202607-008', category: '功能建议', title: '希望增加活动报名提醒', content: '建议在报名结束前一天发送一次站内提醒，避免错过报名时间。', time: '2026-07-26 10:18' },
      { id: 'FB-202607-005', category: '问题咨询', title: '登记证图片上传格式咨询', content: '请问登记证是否支持 JPG 以外的图片格式？', time: '2026-07-19 16:22' }
    ],
    enrollments: [
      { id: 'ENR-ACT-01', activityId: 'ACT-01', name: '2026 年鄞州区无人机飞行安全培训', applicant: '陈*', phone: '138****2408', formData: { 报名人: '陈先生', 联系电话: '138****2408', 备注: '按时参加现场培训' }, time: '2026-07-31 10:12', state: '待确认' },
      { id: 'ENR-ACT-02', activityId: 'ACT-02', name: '夏季低空安全宣传进社区', applicant: '李*', phone: '137****5119', formData: { 报名人: '李女士', 联系电话: '137****5119', 备注: '携带无人机安全手册' }, time: '2026-08-02 09:36', state: '已确认' }
    ],
    messages: [
      { id: 'MSG-01', title: '飞行计划信息待补充', content: '您有一条飞行计划信息待补充，请尽快完善后提交。', channel: '系统推送', time: '今天 09:20', state: '已推送', pusher: '综合管理员', read: false },
      { id: 'MSG-02', title: '低空安全培训报名成功', content: '您已成功报名低空安全培训，请按时参加。', channel: '浙里办推送', time: '昨天 15:30', state: '已推送', pusher: '活动运营员', read: true },
      { id: 'MSG-03', title: '登记证信息归集成功提醒', content: '您的 UOM 登记证信息已归集成功，可在登记证管理中查看。', channel: '系统推送', time: '07-22 10:06', state: '已推送', pusher: '综合管理员', read: true },
      { id: 'MSG-04', title: '低空安全宣传月活动预告', content: '低空安全宣传月活动即将开始，欢迎报名参加。', channel: '浙里办推送', time: '07-20 09:00', state: '未推送', pusher: '活动运营员', read: false }
    ],
    users: [
      { id: 'USR-001', name: '陈先生（演示）', type: '个人', idNumber: '3302**********0412', phone: '138****2408', address: '鄞州区（示例地址）', license: '未上传', licenseFileName: '', drones: 2, status: '正常' },
      { id: 'USR-002', name: '李女士（演示）', type: '个人', idNumber: '3302**********0836', phone: '137****5119', address: '鄞州区某街道（示例）', license: '已上传', licenseFileName: '飞行执照图片.png', drones: 1, status: '待核查' }
    ],
    companies: [
      { id: 'ENT-001', name: '鄞州云航服务有限公司（演示）', creditCode: '9133**********8X', verified: '已认证', contact: '王女士（演示）', phone: '139****1682', syncState: '已同步', accounts: 6, drones: 5, status: '正常' },
      { id: 'ENT-002', name: '甬城巡检服务有限公司（演示）', contact: '赵*（演示）', accounts: 2, drones: 4, status: '正常' },
      { id: 'ENT-003', name: '东湖测绘技术有限公司（演示）', contact: '林*（演示）', accounts: 3, drones: 3, status: '待核查' }
    ],
    alerts: [
      { id: 'ALT-01', type: '待核查', title: '计划信息待补充', zone: '演示区域 A-03', time: '09:20', status: '待处理', rule: '计划完整性核查', pushes: [] },
      { id: 'ALT-02', type: '提醒', title: '飞行区域关联提示', zone: '演示区域 B-01', time: '08:46', status: '已记录', rule: '飞行区域规则提醒', pushes: [] },
      { id: 'ALT-03', type: '异常', title: '肩灯感知无报备目标告警', zone: '演示区域 C-02', time: '昨天 16:10', status: '待处置', rule: '未报备目标实时告警', evidence: { sn: 'SN-****-77Q2', model: '未知机型（演示）', pilotGps: '121.5**°E, 29.8**°N（模糊化）', capturedAt: '2026-07-29 16:10:24', source: '肩灯 SL-2026-001 感知回传（mock）' }, pushes: [{ target: '指挥中心大屏（模拟）', time: '2026-07-29 16:10', state: '已送达' }] }
    ],
    shoulderLights: [
      { id: 'SL-2026-001', state: '已领用', holder: '张警官', unit: '首南派出所', issuedAt: '2026-07-22 09:00', returnedAt: '—' },
      { id: 'SL-2026-002', state: '在库', holder: '—', unit: '—', issuedAt: '—', returnedAt: '2026-07-18 17:30' },
      { id: 'SL-2026-003', state: '维修中', holder: '—', unit: '—', issuedAt: '—', returnedAt: '—' },
      { id: 'SL-2026-004', state: '已领用', holder: '李警官', unit: '钟公庙派出所', issuedAt: '2026-07-25 08:30', returnedAt: '—' },
      { id: 'SL-2026-005', state: '在库', holder: '—', unit: '—', issuedAt: '—', returnedAt: '—' }
    ],
    lightMaintenance: [
      { id: 'MT-001', device: 'SL-2026-003', type: '维修', detail: '蓝牙模块信号不稳定，返厂检测', operator: '设备维护组', time: '2026-07-24', state: '维修中' },
      { id: 'MT-002', device: 'SL-2026-002', type: '检修', detail: '半年度例行检修，功能正常', operator: '设备维护组', time: '2026-07-18', state: '已完成' }
    ],
    feedbackForms: [
      { id: 'FORM-01', name: '平台功能与服务反馈表', scene: '通用反馈', fields: [['反馈类型', '单选', '必填'], ['关注主题', '多选', '选填'], ['反馈标题', '文本', '必填'], ['详细说明', '多行文本', '必填'], ['图片附件', '多张图片', '选填']], state: '已发布', updated: '2026-07-20' },
      { id: 'FORM-02', name: '低空安全隐患线索表', scene: '隐患上报', fields: [['隐患位置', '文本', '必填'], ['隐患类型', '多选', '选填'], ['隐患描述', '多行文本', '必填'], ['现场照片', '多张图片', '选填']], state: '已下架', updated: '2026-06-18' }
    ],
    linkage: {
      planPush: [
        { id: 'PUSH-FP-01', plan: 'FP-20260803-018（演示）', content: '计划时间、街道级区域、操作员（脱敏）、设备登记标志', time: '2026-08-03 09:15', state: '模拟已推送' },
        { id: 'PUSH-FP-02', plan: 'FP-20260728-006（演示）', content: '计划时间、街道级区域、操作员（脱敏）、设备登记标志', time: '2026-07-26 10:32', state: '模拟已推送' }
      ],
      compareResult: [
        { id: 'CMP-01', sn: 'SN-****-0192', result: '合法飞行（静默）', time: '2026-07-30 09:41', state: '模拟已推送' },
        { id: 'CMP-02', sn: 'SN-****-77Q2', result: '无报备告警', time: '2026-07-29 16:10', state: '模拟已推送' }
      ],
      report: [
        { id: 'RPT-01', theme: '无人机用户基本信息（脱敏）', frequency: '实时', time: '—', state: '模拟待接入' },
        { id: 'RPT-02', theme: '无人机设备信息（脱敏）', frequency: '实时', time: '—', state: '模拟待接入' },
        { id: 'RPT-03', theme: '飞行计划报备信息（区域模糊化）', frequency: '实时', time: '—', state: '模拟待接入' }
      ]
    }
  };
})();
