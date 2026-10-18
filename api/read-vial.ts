import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

type DoseUnit = 'mcg' | 'mg' | 'iu'

type LabelRead = {
  name: string
  vialMg: number | null
  doseAmount: number | null
  doseUnit: DoseUnit | null
  notes: string
}

const UNITS = new Set<DoseUnit>(['mcg', 'mg', 'iu'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function num(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

function clean(raw: unknown): LabelRead {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const unit = typeof row.doseUnit === 'string' ? row.doseUnit.toLowerCase() : ''
  const notes = typeof row.notes === 'string' ? row.notes.trim().slice(0, 400) : ''
  const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
  return {
    name,
    vialMg: num(row.vialMg),
    doseAmount: num(row.doseAmount),
    doseUnit: UNITS.has(unit as DoseUnit) ? (unit as DoseUnit) : null,
    notes,
  }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Photo import is not configured.' }, 503)
  }
  if (!openaiKey) {
    return json(
      { error: 'Photo import needs an OpenAI key on the server (OPENAI_API_KEY).' },
      503,
    )
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sign in to import a photo.' }, 401)

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sign in to import a photo.' }, 401)

  let image = ''
  try {
    const body = (await request.json()) as { image?: string }
    image = typeof body.image === 'string' ? body.image : ''
  } catch {
    return json({ error: 'Could not read that photo.' }, 400)
  }

  if (!image.startsWith('data:image/')) {
    return json({ error: 'Use a photo of the vial label.' }, 400)
  }
  if (image.length > 6_000_000) {
    return json({ error: 'That photo is too large. Try again closer to the label.' }, 413)
  }

  const prompt = [
    'Read only the text printed on this peptide vial label.',
    'Return JSON with keys name, vialMg, doseAmount, doseUnit, notes.',
    'name: the product name on the label.',
    'vialMg: the total contents of the vial as a number, in mg when the label uses mg. Use null if it is not printed.',
    'doseAmount: a per-dose amount only when a dose is actually printed. Use null if it is not printed. Do not invent a dose.',
    'doseUnit: mcg, mg, or iu, matching doseAmount. Use null if there is no printed dose.',
    'notes: other short printed facts such as lot or concentration. Do not give instructions or suggest a dose.',
    'If the photo is not a vial label, set name to an empty string and the numbers to null.',
  ].join(' ')

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${openaiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
    }),
  })

  if (!aiRes.ok) {
    let detail = ''
    try {
      const errBody = (await aiRes.json()) as { error?: { code?: string; message?: string } }
      detail = `${errBody.error?.code || ''} ${errBody.error?.message || ''}`.toLowerCase()
    } catch {
      detail = ''
    }
    if (aiRes.status === 429 || detail.includes('quota') || detail.includes('credit')) {
      return json(
        {
          error:
            'Photo import has no OpenAI credits left. Add credits at platform.openai.com, then try the photo again.',
        },
        502,
      )
    }
    return json({ error: 'Could not read that label. Try the photo again.' }, 502)
  }

  const aiJson = (await aiRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = aiJson.choices?.[0]?.message?.content || '{}'
  let parsed: unknown = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    parsed = {}
  }
  const label = clean(parsed)
  if (!label.name && label.vialMg == null) {
    return json({ error: 'No vial label found in that photo.' }, 422)
  }
  return json(label)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const response = await POST(
    new Request('https://dosed.local/api/read-vial', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: String(req.headers.authorization || ''),
      },
      body: Buffer.concat(chunks),
    }),
  )
  res.statusCode = response.status
  res.setHeader('content-type', 'application/json')
  res.end(await response.text())
}
