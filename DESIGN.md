# SynBio AI v2.1 — 功能扩展设计文档

## 一、宿主特异性约束（Task #9）

### 问题
当前 AI 生成的工程策略存在宿主特异性错误，例如建议在 E. coli 中敲除 crtY（该基因在 E. coli 中不存在）。

### 方案

**数据层（lib/databases.ts）**

新增 `HOST_GENOME` 常量，记录常见宿主的内源基因和缺失通路：

```typescript
const HOST_GENOME: Record<string, { hasGenes: string[]; lackPathways: string[] }> = {
  'E. coli': {
    hasGenes: ['dxs', 'idi', 'ispA', 'ispB', 'ispC', 'ispD', 'ispE', 'ispF', 'ispG', 'ispH'],
    lackPathways: ['MVA途径', 'crtY', 'crtZ', 'crtW', 'crtS'],
  },
  'S. cerevisiae': {
    hasGenes: ['ERG10', 'ERG13', 'ERG12', 'ERG8', 'ERG19', 'IDI1', 'ERG20'],
    lackPathways: ['MEP途径', 'crtI', 'crtB', 'crtE'],
  },
  'B. subtilis': {
    hasGenes: ['dxs', 'idi', 'ispA'],
    lackPathways: ['MVA途径'],
  },
}
```

`gatherContext()` 返回的 `DatabaseContext` 新增 `hostGenome` 字段。

**AI 层（lib/deepseek.ts）**

`buildContext()` 接收 `host` 参数，将宿主基因组信息注入 prompt。

`generatePrompt` 新增约束：
- 敲除基因必须在宿主内源基因列表中存在
- 缺少的通路必须在 notes 中注明"需异源引入"

---

## 二、PubMed 文献引用（Task #10）

### 方案

**数据层（lib/databases.ts）**

新增 `queryPubMed(query: string)` 函数，调用 NCBI E-utilities API：
- `esearch`：搜索 PMID 列表（retmax=3）
- `esummary`：获取标题、年份

`DatabaseContext` 新增 `literature` 字段：
```typescript
literature: { title: string; pmid: string; year: string }[]
```

查询词：`${molecule} biosynthesis metabolic engineering`

**前端（components/AnalysisResult.tsx）**

新增"相关文献"区块，每条文献显示标题（链接到 PubMed）+ 年份。

---

## 三、多产物对比模式（Task #11）

### 方案

**状态层（app/analyze/AnalyzeClient.tsx）**

- `result` → `results: AnalysisResultType[]`（最多保留 2 条）
- 新增 `compareMode: boolean` 状态
- `compareMode=false`：新结果替换旧结果
- `compareMode=true`：新结果追加，最多 2 条

**布局**

- 单结果：原有布局
- 双结果：`grid grid-cols-2 gap-4`，两个 `AnalysisResult` 并排

**表单（components/AnalysisForm.tsx）**

新增对比模式 checkbox，通过 `onCompareChange` prop 传递状态。

---

## 实现顺序

1. Task #9 — 宿主特异性（改 databases.ts + deepseek.ts）
2. Task #10 — PubMed 文献（改 databases.ts + AnalysisResult.tsx）
3. Task #11 — 对比模式（改 AnalyzeClient.tsx + AnalysisForm.tsx）
