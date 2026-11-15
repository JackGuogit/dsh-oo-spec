# 反例 03：为模式而模式（无变化点）

## 错误产出

```text
需求：踩 / 取消踩 要给动态作者发一条站内通知。目前只有"站内信"一种渠道。

AI 产出：
  interface Notifier { void send(...); }
  class InboxNotifier implements Notifier { ... }
  class NotifierFactory { Notifier create(String type); }
  class NotifierDecorator implements Notifier { ... }   // 预留给"短信 + 站内信组合"
  class NotificationStrategyContext { ... }             // 预留给"以后可能换推送策略"

理由："符合 OCP，以后加短信/推送不用改代码"
```

## 哪里错了

1. **没有变化点，只有想象的变化**（宪法 #7）。真实情况：只有一种渠道，时间窗内没有第二种。
2. **没有时间窗**（宪法 #8）。"以后可能"不是理由。
3. **命中 NOP**（`cards/C07`）：为了不存在的第二种渠道，付出 4 个类 + 1 个工厂 + 1 个装饰器的成本，业务代码只有 3 行。
4. **Decorator 用错位置**：Decorator 解决"职责动态可组合"，这里只有一种渠道，组合数为 1。
5. 更隐蔽的代价：后来接短信时，真正需要的不是 Decorator，而是"渠道选择 + 失败降级"，现有结构帮不上忙，还得改。

## 正确产出

```text
NotificationService.notify(userId, content)
  └─ InboxSender.send(userId, content)     // 一个类，一个方法
```

并在交付物里记一笔：

```markdown
变化点: 通知渠道（站内信 → 可能增加短信/推送）
时间窗: 12 个月内高概率（零售/社交产品）
处置  : 暂不抽象；把发送动作收敛到 InboxSender 单一出口，将来替换只改这一处
依据  : 宪法 #7/#8；现在抽接口无第二个实现，属 NOP
```

**"收敛到单一出口"就是低成本的变化准备**，不需要接口、工厂、装饰器。

## 什么情况下这条反例会变成正例

只有当下列条件**同时**成立，抽象才成立：

- 已经出现或已排期第二个实现（有时间点，不是"以后"）
- 两个实现的切换在运行期发生（不是编译期选一个）
- 切换逻辑本身有业务含义（降级、灰度、按用户分层）

## 触发这条反例的信号

- 交付物里接口数 > 实现类数
- 出现 `XxxFactory` 但只有一个产品
- 抽象理由里出现"以后""可能""预留"
- 一个 50 行的功能配了 5 个类

## 对应条文

- 宪法 #7（变化驱动）、#8（时间窗）
- `cards/C08`（第 3 步：时间窗内不会变 → 不引入）
- `cards/C07`（NOP）
- `tables/variation-to-pattern.md`（Decorator 的不适用条件）
