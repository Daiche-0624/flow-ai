import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { staff, tasks } = await req.json()

    const activeStaff = staff.filter((s: any) => s.status !== 'off')
    const pendingTasks = tasks.filter((t: any) => t.status !== 'done')
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    const sorted = [...pendingTasks].sort((a: any, b: any) => {
      const delayDiff = b.delay - a.delay
      if (delayDiff !== 0) return delayDiff
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    const prompt = `あなたはカフェの現場マネージャーを支援するAIアシスタントです。
以下の状況を分析し、最適なタスク配分を提案してください。

## スタッフ状況
${activeStaff.map((s: any) => `- ${s.name}（役割: ${s.role}、スキル: ${s.skills.join('・')}、状態: ${s.status === 'active' ? '稼働中' : '休憩中'}）`).join('\n')}

## 対応が必要なタスク（優先度順）
${sorted.map((t: any) => `- [${t.id}] ${t.title}（優先度: ${t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}、遅延: ${t.delay}分、担当: ${t.assignedTo ? activeStaff.find((s: any) => s.id === t.assignedTo)?.name ?? '不明' : '未割当'}）`).join('\n')}

## ルール
1. スキルに合ったタスクのみ割り当てる
2. 休憩中のスタッフは対象外
3. 1人に同時3件以上は割り当てない
4. 遅延中・未割当の高優先タスクを最優先で解消する

## 出力形式（JSONのみ・他のテキスト不要）
{"assignments":[{"taskId":"タスクID","staffId":"スタッフID","reason":"理由を20字以内で"}],"summary":"変更内容を1〜2文で"}`

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .map((b: any) => (b.type === 'text' ? b.text : ''))
      .join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return Response.json({ result })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'AI提案の生成に失敗しました' }, { status: 500 })
  }
}