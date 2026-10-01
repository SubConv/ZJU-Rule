# ZJU Rule

基于 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 修改后的 ZJU 分流规则

项目使用 CC-BY-SA-4.0 协议发布 [![CC-BY-SA-4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh)


## 支持功能

+ ZJU 内网资源/学术资源分流（直连访问/ RVPN访问）
+ 节点自动选择
+ 节点故障转移
+ 节点负载均衡
+ Telegram 分流
+ Youtube 分流
+ Netflix 分流
+ 动画疯分流
+ 哔哩哔哩分流（解锁港澳台）
+ Google 服务分流
+ OneDrive 分流
+ Microsoft 服务分流
+ Apple 服务分流
+ 游戏平台分流（Steam/Epic/Sony）
+ 网易云音乐分流（灰色歌曲解锁）
+ 广告拦截/应用净化/AdBlock/隐私防护
+ 节点分地区管理（香港/日本/美国/台湾/狮城/韩国）
+ ...

## 常见问题

+ 我可以对 ZJU Rule 进行完善吗？

  欢迎通过 Issue 提出意见或建议，或提交 Pull Request 完善规则。ZJU 内网规则之外的规则请向项目上游 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 进行反馈，上游不予采纳时也可以向 ZJU Rule 提交

## Sub-Store 与自定义直连

- [Sub-Store 配置步骤](Clash/config/SubStore.md)：组合订阅 → 远程 ZJU.ini → 文件脚本 → 完整 Mihomo 配置。
- [适配脚本](Clash/config/zju-sub-store.js)按订阅来源区分家宽落地、中转和高速；仅显示存在节点的分类和地区组。
- [ResearchDirect.list](Clash/ResearchDirect.list)维护明确需要直连的学术网站，当前包含 ResearchGate；对应 [Provider](Clash/Providers/ResearchDirect.yaml) 同步提供。
- `ZJU.ini` 将自定义学术直连放在最前面，直接使用 `DIRECT`，不受“全球直连”策略组的手动选择影响。
- 修改 `.list` 后可运行 `python3 update_providers.py` 同步生成 YAML；新增规则只代表路由选择，不保证目标网站在当前网络中可达。
