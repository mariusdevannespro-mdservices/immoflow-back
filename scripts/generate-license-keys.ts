import crypto from "crypto"
import fs from "fs"
import path from "path"
import { prisma } from "../src/db"

function makeCode() {
  // format lisible : XXXX-XXXX-XXXX-XXXX
  const raw = crypto.randomBytes(16).toString("hex").toUpperCase() // 32 chars
  return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex")
}

async function main() {
  const COUNT = 50
  const codes: string[] = []

  for (let i = 0; i < COUNT; i++) {
    codes.push(makeCode())
  }

  // insert DB (hash only)
  await prisma.licenseKey.createMany({
    data: codes.map((code) => ({
      codeHash: sha256(code),
      plan: "pro_plus",
      isActive: true,
    })),
    skipDuplicates: true,
  })

  // export codes (⚠️ à stocker en lieu sûr)
  const outDir = path.join(process.cwd(), "exports")
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `license-keys-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify({ plan: "pro_plus", codes }, null, 2), "utf-8")

  console.log("✅ Generated & inserted keys:", COUNT)
  console.log("📦 Saved codes to:", outPath)
  console.log("⚠️ Keep this file private. DB only contains hashes.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
