/**
 * Downloads face-api.js tiny_face_detector model weights into public/models/.
 * Run once: pnpm download-models
 */
import { mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'models')
const BASE =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
]

await mkdir(OUT, { recursive: true })

for (const file of FILES) {
  process.stdout.write(`Downloading ${file} … `)
  const res = await fetch(`${BASE}/${file}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const buf = await res.arrayBuffer()
  await writeFile(join(OUT, file), Buffer.from(buf))
  console.log('✓')
}

console.log(`\nModels saved to public/models/ (${FILES.length} files)`)
