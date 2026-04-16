import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lessons } from '../src/data/lessons.js'
import { plans } from '../src/data/plans.js'
import { offers } from '../src/data/offers.js'
import { wisdomSnippets } from '../src/data/wisdom.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const targetDir = path.resolve(__dirname, '../backend/CodigoJudaico.Api/SeedData')

await mkdir(targetDir, { recursive: true })

const files = [
  ['lessons.json', lessons],
  ['plans.json', plans],
  ['offers.json', offers],
  ['wisdom.json', wisdomSnippets],
]

for (const [name, data] of files) {
  const fullPath = path.join(targetDir, name)
  await writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`wrote ${fullPath}`)
}
