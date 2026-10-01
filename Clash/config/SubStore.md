# Sub-Store 接入 ZJU Rule

## 配置

1. 在 Sub-Store 创建组合订阅 `Plinx`。
2. 默认分类：`Plinx-home` 是中转订阅；`Plinx-high` 是高速订阅。
3. 独立家宽落地订阅可命名为 `Plinx-residential` 并加入组合；如名称不同，修改脚本顶部 `sourceCategory`。不要把名称包含“家宽”的中转入口当作独立家宽落地。
4. 新建普通“文件”（不要选择“mihomo 配置”），名称 `ZJU-Plinx`，来源选择“远程”，链接：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/ZJU.ini
   ```

5. 添加脚本操作，直接粘贴同目录 `zju-sub-store.js` 的全部内容；或使用远程脚本链接：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/zju-sub-store.js
   ```

6. 即时预览，确认有 `proxies`、`proxy-groups`、`rule-providers`、`rules`，保存后复制完整配置链接给 Mihomo 客户端。

测试 PR 分支时，INI 和远程脚本 URL 的 `main` 替换为实际分支。完整测试还需将脚本顶部 `ownRoot` 的分支一并替换，否则规则集仍取自 `main`。

## 行为

- `proxies` 是配置必需的节点清单，`proxy-groups` 决定分类展示。
- 主选择组只显示实际存在的线路分类。每类具有自动、故障转移、手动或地区子组。没有节点的家宽和地区组不生成，不用 `DIRECT` 占位。
- 高速地区按节点名称识别；`GM` 暂按当前命名约定归德国，可在脚本 `regions` 修改；没有地区信息的中转节点不推断落地国家。
- 去掉流量、到期、重置等公告节点；应用分流组只引用分类，不重复展开全部节点。
- 保留 ZJU、学术、应用规则的既有顺序。`ResearchDirect.list` 位于最前，ResearchGate 及其子域名明确走 `DIRECT`。
- 家宽组不存在时，旧的家宽组引用改为主选择组；这不代表中转节点是家宽落地。
- 同名节点追加编号；Sub-Store 的内部来源信息只用于分类，不输出到客户端。
- INI 在重新生成配置时读取，受 Sub-Store 缓存影响；规则集由 Mihomo 每 86400 秒更新。修改后可禁用远程缓存重新预览，并在客户端更新规则集。

## 维护与限制

- 新增明确需要直连的网站时，编辑 `Clash/ResearchDirect.list`，再运行 `python3 update_providers.py` 同步 Provider。`DOMAIN-SUFFIX,researchgate.net` 覆盖主站和子域名。
- 直连规则只决定路由，不保证目标网站在当前网络中可以访问。
- 脚本仅适配当前 INI 的分组、规则集、`[]GEOIP` 和 `[]FINAL`，不执行全部 subconverter 选项，也不加载注释掉的 `clash_rule_base`。
- 原 INI 供 subconverter 使用，其分类依赖节点名称。脚本供 Sub-Store 使用，其分类依赖订阅来源；两者不要混淆。原 INI 的空地区组行为取决于 subconverter，动态隐藏空组由本脚本实现。
- 输出采用最小网络配置。现有端口、DNS、TUN、控制接口和密钥应通过 Clash for Linux 的 Mixin 管理，导入前检查运行配置。
- Sub-Store 和客户端分别需要能获取 GitHub 文件及远程规则集。
- 不要将订阅地址、节点凭据或控制接口密钥提交到仓库。
