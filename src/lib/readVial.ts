import type { DoseUnit } from '../types'

export type VialLabelRead = {
  name: string
  vialMg: number | null
  doseAmount: number | null
  doseUnit: DoseUnit | null
  notes: string
}

export async function readVialLabel(
  imageDataUrl: string,
  accessToken: string,
): Promise<VialLabelRead> {
  const res = await fetch('/api/read-vial', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ image: imageDataUrl }),
  })
  const data = (await res.json().catch(() => ({}))) as Partial<VialLabelRead> & {
    error?: string
  }
  if (!res.ok) {
    throw new Error(data.error || 'Could not read that photo.')
  }
  return {
    name: typeof data.name === 'string' ? data.name : '',
    vialMg: typeof data.vialMg === 'number' ? data.vialMg : null,
    doseAmount: typeof data.doseAmount === 'number' ? data.doseAmount : null,
    doseUnit: data.doseUnit === 'mcg' || data.doseUnit === 'mg' || data.doseUnit === 'iu' ? data.doseUnit : null,
    notes: typeof data.notes === 'string' ? data.notes : '',
  }
}
