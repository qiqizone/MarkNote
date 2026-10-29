type JsonNode = Record<string, unknown>
type JsonMark = Record<string, unknown>

interface Run {
  text: string
  marks?: JsonMark[]
}

interface SourceBlock {
  node: JsonNode
  text: string
  runs: Run[]
  attrs: Record<string, unknown>
}

function asNodes(value: unknown): JsonNode[] {
  return Array.isArray(value) ? (value as JsonNode[]) : []
}

function plainText(node: JsonNode): string {
  if (typeof node.text === 'string') return node.text
  return asNodes(node.content).map(plainText).join('')
}

/** 只读取段落/标题这类直接由文本组成的节点，其余结构不参与格式合并 */
function readRuns(node: JsonNode): Run[] {
  if (node.type !== 'paragraph' && node.type !== 'heading') return []
  const runs: Run[] = []
  for (const child of asNodes(node.content)) {
    if (typeof child.text !== 'string') continue
    runs.push({
      text: child.text,
      marks: Array.isArray(child.marks) ? (child.marks as JsonMark[]) : undefined,
    })
  }
  return runs
}

function charsOf(runs: Run[]) {
  const chars: Array<{ ch: string; marks?: JsonMark[] }> = []
  for (const run of runs) {
    for (const ch of run.text) chars.push({ ch, marks: run.marks })
  }
  return chars
}

function sameMarks(a?: JsonMark[], b?: JsonMark[]) {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
}

function toRuns(chars: Array<{ ch: string; marks?: JsonMark[] }>): Run[] {
  const runs: Run[] = []
  for (const item of chars) {
    const last = runs[runs.length - 1]
    if (last && sameMarks(last.marks, item.marks)) last.text += item.ch
    else runs.push({ text: item.ch, ...(item.marks?.length ? { marks: item.marks } : {}) })
  }
  return runs
}

/** 把新文本套回旧段落的格式：相同的前后缀字符沿用原格式，新插入的字沿用插入点的格式 */
function retype(runs: Run[], text: string): Run[] {
  const chars = charsOf(runs)
  const old = chars.map((item) => item.ch).join('')
  if (!old || old === text) return runs

  const limit = Math.min(old.length, text.length)
  let prefix = 0
  while (prefix < limit && old[prefix] === text[prefix]) prefix += 1
  let suffix = 0
  while (suffix < limit - prefix && old[old.length - 1 - suffix] === text[text.length - 1 - suffix]) {
    suffix += 1
  }

  const next = chars.slice(0, prefix)
  const inherited = prefix < chars.length ? chars[prefix].marks : chars[chars.length - 1].marks
  for (let i = prefix; i < text.length - suffix; i += 1) {
    next.push({ ch: text[i], marks: inherited })
  }
  for (let i = 0; i < suffix; i += 1) {
    next.push({ ch: text[text.length - suffix + i], marks: chars[old.length - suffix + i].marks })
  }
  return toRuns(next)
}

function paragraph(attrs: Record<string, unknown>, runs: Run[]): JsonNode {
  const node: JsonNode = { type: 'paragraph' }
  if (Object.keys(attrs).length) node.attrs = attrs
  if (runs.length) {
    node.content = runs.map((run) => ({
      type: 'text',
      text: run.text,
      ...(run.marks?.length ? { marks: run.marks } : {}),
    }))
  }
  return node
}

/**
 * 把 Markdown 模式里编辑过的文本合并回文档结构：
 * 文本没变的段落整段复用（颜色、字体等格式原样保留），
 * 文本有改动的段落按字符对齐沿用原来的格式。
 */
export function mergeDocWithText(
  doc: Record<string, unknown>,
  text: string,
): Record<string, unknown> | null {
  const top = asNodes(doc.content)
  if (!top.length) return null

  const sources: SourceBlock[] = top.map((node) => ({
    node,
    text: plainText(node),
    runs: readRuns(node),
    attrs: node.type === 'paragraph' ? ((node.attrs as Record<string, unknown>) ?? {}) : {},
  }))

  const used = sources.map(() => false)
  const lines = text.split('\n')
  const content: JsonNode[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const exact = sources.findIndex((item, i) => !used[i] && item.text === line)
    if (exact >= 0) {
      used[exact] = true
      content.push(sources[exact].node)
      continue
    }
    const base = index < sources.length && !used[index] ? index : -1
    if (base >= 0) {
      used[base] = true
      content.push(paragraph(sources[base].attrs, line ? retype(sources[base].runs, line) : []))
      continue
    }
    content.push(paragraph({}, line ? [{ text: line }] : []))
  }

  return { type: 'doc', content }
}
