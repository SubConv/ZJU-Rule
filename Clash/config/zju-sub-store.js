// Sub-Store: 普通文件 -> 远程来源 ZJU.ini -> 脚本操作（粘贴本文件）。
// 仅适配当前 ZJU.ini 的规则/分组语法，不是通用 subconverter 实现。
// 修改组合订阅名称时，只需修改下一行。
const collectionName = 'Plinx';
// 分类由订阅来源决定，不根据 VLESS / Hysteria2 推测线路类型。
// 添加独立家宽落地订阅后，将它加入 Plinx，并在这里登记其名称。
const sourceCategory = { 'Plinx-home': 'relay', 'Plinx-high': 'high', 'Plinx-residential': 'home' };
const ownRoot = 'https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/';
const upstreamRoot = 'https://raw.githubusercontent.com/SubConv/ZJU-Rule/main/';
const ini = $content ?? $files?.[0];
if (typeof ini !== 'string' || !ini.includes('[custom]')) {
  throw new Error('文件远程来源必须是 Clash/config/ZJU.ini，不能使用仓库网页地址。');
}

const entries = [];
let section = '';
for (const raw of ini.replace(/^\uFEFF/, '').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || /^[;#]/.test(line)) continue;
  if (line.startsWith('[')) { section = line; continue; }
  if (section !== '[custom]') continue;
  const at = line.indexOf('=');
  if (at < 0) throw new Error('INI 存在无法解析的行');
  entries.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
}

const sourceProxies = await produceArtifact({
  type: 'collection', name: collectionName,
  platform: 'ClashMeta', produceType: 'internal',
});
if (!Array.isArray(sourceProxies) || !sourceProxies.length) {
  throw new Error('Plinx 没有可输出的节点，请先检查组合订阅。');
}
const groupDefs = entries.filter(([key]) => key === 'custom_proxy_group')
  .map(([, value]) => value.split('`'));
if (!groupDefs.length) throw new Error('INI 没有策略组');
// 按订阅来源分类。家宽专用中转线路仍属于中转，不推断其落地国家。
const notice = /通知|公告|剩余|重置|到期|流量|套餐|更新订阅|无节点可用/;
const proxies = sourceProxies.filter(proxy => !notice.test(proxy.name ?? ''))
  .map(proxy => ({ ...proxy }));
if (!proxies.length) throw new Error('过滤公告后没有可用节点');
const categories = new Map();
for (const proxy of proxies) {
  const category = sourceCategory[proxy._subName];
  if (!category) throw new Error('发现未知订阅来源，请在 sourceCategory 中登记分类');
  categories.set(proxy, category);
}
const groupNames = new Set(groupDefs.map(parts => parts[0]));
const newNames = ['🏠 家宽节点', '⚡ 高速节点', '🏠 家宽自动', '🏠 家宽故障转移',
  '🏠 家宽手动', '🛰️ 中转自动', '🛰️ 中转故障转移', '🛰️ 中转手动',
  '⚡ 高速自动', '⚡ 高速故障转移', '🇩🇪 德国节点', '🇬🇧 英国节点', '🌐 其他高速节点'];
if (groupNames.size !== groupDefs.length) throw new Error('INI 策略组名称重复');
const occupied = new Set(['DIRECT', 'REJECT', ...groupNames, ...newNames]);
for (const proxy of proxies) {
  if (!proxy.name) throw new Error('订阅节点缺少名称');
  const original = proxy.name;
  let suffix = 2;
  while (occupied.has(proxy.name)) proxy.name = `${original} (${suffix++})`;
  occupied.add(proxy.name);
}

const originalGroups = groupDefs.map(parts => {
  const [name, type] = parts;
  if (!['select', 'url-test', 'fallback', 'load-balance'].includes(type)) {
    throw new Error(`暂不支持策略组类型：${type}`);
  }
  const automated = type !== 'select';
  if (automated && parts.length < 5) throw new Error(`测活参数缺失：${name}`);
  const selectors = automated ? parts.slice(2, -2) : parts.slice(2);
  const members = [];
  for (const selector of selectors) {
    if (selector.startsWith('[]')) {
      const member = selector.slice(2);
      if (!occupied.has(member)) throw new Error(`策略组引用不存在：${member}`);
      members.push(member);
    } else {
      const pattern = new RegExp(selector);
      members.push(...proxies.filter(proxy => pattern.test(proxy.name)).map(proxy => proxy.name));
    }
  }
  const selected = [...new Set(members)];
  // 没有匹配节点时用 DIRECT 占位，避免生成无法启动的空策略组。
  if (!selected.length) return { name, type: 'select', proxies: ['DIRECT'] };
  const group = { name, type, proxies: selected };
  if (automated) {
    group.url = parts.at(-2);
    const timing = parts.at(-1).split(',');
    group.interval = Number(timing[0]);
    if (!Number.isFinite(group.interval) || group.interval <= 0) {
      throw new Error(`测活间隔无效：${name}`);
    }
    if (type === 'url-test' && timing[2]) group.tolerance = Number(timing[2]);
    if (type === 'load-balance') group.strategy = 'consistent-hashing';
  }
  return group;
});

// 主入口展示有实际节点的分类；实际节点保留在叶子组中。
const home = proxies.filter(proxy => categories.get(proxy) === 'home').map(proxy => proxy.name);
const relay = proxies.filter(proxy => categories.get(proxy) === 'relay').map(proxy => proxy.name);
const highProxies = proxies.filter(proxy => categories.get(proxy) === 'high');
const high = highProxies.map(proxy => proxy.name);
if (!relay.length || !high.length) throw new Error('中转或高速订阅没有可用节点，请检查两个订阅');
const select = (name, members) => ({ name, type: 'select', proxies: members });
const auto = (name, members, type = 'url-test') => ({
  name, type, proxies: members, url: 'http://www.gstatic.com/generate_204',
  interval: 300, ...(type === 'url-test' ? { tolerance: 50 } : {}),
});
const regions = [
  ['🇺🇲 美国节点', /^(?:US(?=\[|[-_\s])|美国|美國)/i],
  ['🇭🇰 香港节点', /^(?:HK(?=\[|[-_\s])|香港)/i],
  ['🇯🇵 日本节点', /^(?:JP(?=\[|[-_\s])|日本)/i],
  ['🇩🇪 德国节点', /^(?:(?:DE|GM)(?=\[|[-_\s])|德国|德國)/i],
  ['🇬🇧 英国节点', /^(?:(?:UK|GB)(?=\[|[-_\s])|英国|英國)/i],
  ['🇨🇳 台湾节点', /^(?:TW(?=\[|[-_\s])|台湾|台灣)/i],
  ['🇸🇬 狮城节点', /^(?:SG(?=\[|[-_\s])|新加坡|狮城)/i],
  ['🇰🇷 韩国节点', /^(?:KR(?=\[|[-_\s])|韩国|韓國)/i],
];
const regionGroups = regions.map(([name, pattern]) =>
  select(name, highProxies.filter(proxy => pattern.test(proxy.name)).map(proxy => proxy.name)))
  .filter(group => group.proxies.length);
const classified = new Set(regionGroups.flatMap(group => group.proxies));
const other = high.filter(name => !classified.has(name));
if (other.length) regionGroups.push(select('🌐 其他高速节点', other));
const groups = [
  select('🚀 节点选择', [...(home.length ? ['🏠 家宽节点'] : []), '🛰️ 中转节点', '⚡ 高速节点']),
  ...(home.length ? [
    select('🏠 家宽节点', ['🏠 家宽自动', '🏠 家宽故障转移', '🏠 家宽手动']),
    auto('🏠 家宽自动', home), auto('🏠 家宽故障转移', home, 'fallback'),
    select('🏠 家宽手动', home),
  ] : []),
  select('🛰️ 中转节点', ['🛰️ 中转自动', '🛰️ 中转故障转移', '🛰️ 中转手动']),
  auto('🛰️ 中转自动', relay), auto('🛰️ 中转故障转移', relay, 'fallback'),
  select('🛰️ 中转手动', relay),
  select('⚡ 高速节点', ['⚡ 高速自动', '⚡ 高速故障转移', ...regionGroups.map(group => group.name)]),
  auto('⚡ 高速自动', high), auto('⚡ 高速故障转移', high, 'fallback'),
  ...regionGroups,
  { ...auto('🔮 负载均衡', high, 'load-balance'), strategy: 'consistent-hashing' },
];
const remap = new Map([
  ...(!home.length ? [['🏠 家宽节点', '🚀 节点选择']] : []),
  ['⚡ 中转优选', '🛰️ 中转自动'], ['♻️ 自动选择', '⚡ 高速自动'],
  ['🔯 故障转移', '⚡ 高速故障转移'], ['🚀 手动切换', '🚀 节点选择'],
  ['🎥 奈飞节点', '⚡ 高速节点'],
]);
const replacementNames = new Set(groups.map(group => group.name));
const hidden = new Set(['✉️ 通知公告', ...remap.keys(), ...regions.map(([name]) => name)]);
const oldGroupNames = new Set(groupDefs.map(parts => parts[0]));
for (const group of originalGroups) {
  if (hidden.has(group.name) || replacementNames.has(group.name)) continue;
  // 应用分流组仅引用分类组，不展开全部节点；缺失地区也不以 DIRECT 伪装。
  const members = [...new Set(group.proxies.flatMap(member => {
    if (member === 'DIRECT' || member === 'REJECT') return [member];
    if (remap.has(member)) return [remap.get(member)];
    if (replacementNames.has(member)) return [member];
    if (regions.some(([name]) => name === member)) return [];
    if (oldGroupNames.has(member) && !hidden.has(member)) return [member];
    // 校园专用节点仍允许显式列在校园组。
    if (/ZJU|浙大|内网/.test(member) && /ZJU/.test(group.name)) return [member];
    return [];
  }))];
  if (!members.length) members.push('🚀 节点选择');
  groups.push({ ...group, proxies: members });
}
const outputNames = new Set(['DIRECT', 'REJECT', ...proxies.map(proxy => proxy.name), ...groups.map(group => group.name)]);
for (const group of groups) {
  for (const member of group.proxies) {
    if (!outputNames.has(member)) throw new Error(`输出策略组引用不存在：${member}`);
  }
}
// Sub-Store 来源信息仅用于分类，不写入最终客户端节点。
for (const proxy of proxies) {
  for (const key of Object.keys(proxy)) if (key.startsWith('_')) delete proxy[key];
}

const providers = {};
const rules = [];
for (const [key, value] of entries) {
  if (key !== 'ruleset') continue;
  const at = value.indexOf(',');
  if (at < 0) throw new Error('ruleset 缺少逗号');
  const originalPolicy = value.slice(0, at).trim();
  const policy = remap.get(originalPolicy) ?? originalPolicy;
  const source = value.slice(at + 1).trim();
  if (!outputNames.has(policy)) throw new Error(`规则策略不存在：${policy}`);
  if (source.startsWith('[]')) {
    const inline = source.slice(2);
    if (inline === 'FINAL') rules.push(`MATCH,${policy}`);
    else if (/^GEOIP,[^,]+$/.test(inline)) rules.push(`${inline},${policy}`);
    else throw new Error(`暂不支持内联规则：${inline}`);
  } else {
    const url = source.startsWith(upstreamRoot)
      ? ownRoot + source.slice(upstreamRoot.length) : source;
    if (!/^https?:\/\//.test(url) || !url.endsWith('.list')) {
      throw new Error('当前脚本仅支持 HTTP(S) .list 规则源');
    }
    const name = `zju-rule-${Object.keys(providers).length + 1}`;
    providers[name] = {
      type: 'http', behavior: 'classical', format: 'text',
      url, path: `./rule-providers/${name}.list`, interval: 86400,
    };
    rules.push(`RULE-SET,${name},${policy}`);
  }
}
if (!rules.length || !rules.at(-1).startsWith('MATCH,')) {
  throw new Error('INI 需要以 []FINAL 兜底规则结尾');
}
$content = ProxyUtils.yaml.dump({
  'mixed-port': 7890, 'allow-lan': false, mode: 'rule', 'log-level': 'info',
  proxies, 'proxy-groups': groups, 'rule-providers': providers, rules,
});
