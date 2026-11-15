# 反例 01：把「过程内聚」当成「职责不清」，过度拆分

## 错误产出

```text
需求：读一个文件的内容
AI 产出：
  FileExistChecker   （负责判断文件是否存在）
  FilePrivilegeChecker（负责判断权限）
  FileOpener         （负责打开文件）
  FileReader         （负责读）
  ReadFileFacade     （负责串联上面四个）

理由："每个类只做一件事，符合 SRP"
```

## 哪里错了

1. **判定用错了依据**：它按"每个方法一件事"拆，而不是按"职责"拆（宪法 #9）。
2. **内聚级别判错**：`checkExist → checkPrivilege → open → read` 是固定顺序的**过程内聚**（`tables/cohesion-levels.md` 第 4 级），不是"职责混杂"。
3. **引入了不存在的复用**：`checkExist` 同样能服务 `writeFile`、`deleteFile`，说明它们不是只为 `readFile` 存在的——这正是"不是功能内聚"的证据。但结论**不是拆类**，而是"保留在读取流程中"，将来真有第二个调用方再上移。
4. **多了一个 Facade 去串四个类**：原来 1 个函数 5 行，现在 5 个类 + 1 个 Facade，调用方还要理解装配顺序。

## 正确产出

```text
ReadFileService.read(path)
  ├─ checkExist(path)
  ├─ checkPrivilege(path)
  ├─ open(path)
  └─ read() → content
```

一个类，四个私有方法，一个公开方法。理由一行：**过程内聚，元素按固定顺序为同一任务服务，保留。**

## 触发这条反例的信号

- 拆分理由里出现"每个方法只做一件事"
- 拆分后出现了只被调用一次的类
- 拆分后新增了一个"串联用"的类
- 拆分前后，类的数量 > 概念的数量

## 对应条文

- 宪法 #9（内聚看职责，不看调用关系）
- `cards/C05`（三步测试 + 过程内聚的处置）
- `tables/cohesion-levels.md`（第 4 级：过程内聚）
