import { prisma } from "../../db"
import type { ProjectPayload } from "./project.dto"

const projectInclude = {
  depreciationAssets: true,
  user: {
    select: {
      id: true,
      tmi: true,
      socialContribRate: true,
    },
  },
} as const

function isNonEmpty(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim() !== ""
  return true
}

function hasAdvancedFields(payload: ProjectPayload) {
  // Pro+ si:
  // - taxMode réel
  // - amortissements envoyés
  // - OU au moins 1 champ "charges détaillées" rempli
  const hasAssets = (payload.depreciationAssets?.length ?? 0) > 0

  const hasDetailedCharges =
    isNonEmpty(payload.propertyManagementFeeRate) ||
    isNonEmpty(payload.propertyManagementFeeMonthly) ||
    isNonEmpty(payload.rentGuaranteeInsuranceMonthly) ||
    isNonEmpty(payload.accountingFeesAnnual) ||
    isNonEmpty(payload.expectedCapexAnnual)

  const wantsReal = payload.taxMode === "real"

  return wantsReal || hasAssets || hasDetailedCharges
}

async function assertPlanRules(userId: string, payload?: ProjectPayload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  // FREE limit
  if (!user?.plan || user.plan === "free") {
    const count = await prisma.project.count({ where: { userId } })
    if (count >= 1) throw new Error("FREE_LIMIT_REACHED")
  }

  // PRO_PLUS gate (si payload fourni)
  if (payload) {
    const isProPlus = user?.plan === "pro_plus"
    const wantsAdvanced = hasAdvancedFields(payload)

    if (wantsAdvanced && !isProPlus) {
      throw new Error("PRO_PLUS_REQUIRED")
    }
  }

  return user
}

export function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  })
}

export function getProjectById(userId: string, id: string) {
  return prisma.project.findFirst({
    where: { id, userId },
    include: projectInclude,
  })
}

export async function createProject(userId: string, payload: ProjectPayload) {
  await assertPlanRules(userId, payload)

  const { depreciationAssets, ...data } = payload

  return prisma.project.create({
    data: {
      userId,
      ...data,
      depreciationAssets: depreciationAssets?.length
        ? {
            create: depreciationAssets.map((a) => ({
              category: a.category,
              label: a.label,
              amount: a.amount,
              years: a.years,
            })),
          }
        : undefined,
    },
    include: projectInclude,
  })
}

export async function updateProject(userId: string, id: string, payload: ProjectPayload) {
  const exists = await prisma.project.findFirst({ where: { id, userId } })
  if (!exists) return null

  // 🔒 gate aussi en update !
  await assertPlanRules(userId, payload)

  const { depreciationAssets, ...data } = payload

  await prisma.project.update({
    where: { id },
    data: {
      ...data,
    },
    include: projectInclude,
  })

  // Replace assets if provided (simple & safe)
  if (depreciationAssets) {
    await prisma.depreciationAsset.deleteMany({ where: { projectId: id } })
    if (depreciationAssets.length) {
      await prisma.depreciationAsset.createMany({
        data: depreciationAssets.map((a) => ({
          projectId: id,
          category: a.category,
          label: a.label,
          amount: a.amount,
          years: a.years,
        })),
      })
    }
  }

  // Return fresh with assets
  return prisma.project.findFirst({
    where: { id, userId },
    include: projectInclude,
  })
}

export async function deleteProject(userId: string, id: string) {
  const result = await prisma.project.deleteMany({
    where: { id, userId },
  })
  return result.count > 0
}
