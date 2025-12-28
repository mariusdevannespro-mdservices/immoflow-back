"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = listProjects;
exports.getProjectById = getProjectById;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const db_1 = require("../../db");
const projectInclude = {
    depreciationAssets: true,
    user: {
        select: {
            id: true,
            tmi: true,
            socialContribRate: true,
        },
    },
};
function isNonEmpty(value) {
    if (value === null || value === undefined)
        return false;
    if (typeof value === "string")
        return value.trim() !== "";
    return true;
}
function hasAdvancedFields(payload) {
    // Pro+ si:
    // - taxMode réel
    // - amortissements envoyés
    // - OU au moins 1 champ "charges détaillées" rempli
    const hasAssets = (payload.depreciationAssets?.length ?? 0) > 0;
    const hasDetailedCharges = isNonEmpty(payload.propertyManagementFeeRate) ||
        isNonEmpty(payload.propertyManagementFeeMonthly) ||
        isNonEmpty(payload.rentGuaranteeInsuranceMonthly) ||
        isNonEmpty(payload.accountingFeesAnnual) ||
        isNonEmpty(payload.expectedCapexAnnual);
    const wantsReal = payload.taxMode === "real";
    return wantsReal || hasAssets || hasDetailedCharges;
}
async function assertPlanRules(userId, payload) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    });
    // FREE limit
    if (!user?.plan || user.plan === "free") {
        const count = await db_1.prisma.project.count({ where: { userId } });
        if (count >= 1)
            throw new Error("FREE_LIMIT_REACHED");
    }
    // PRO_PLUS gate (si payload fourni)
    if (payload) {
        const isProPlus = user?.plan === "pro_plus";
        const wantsAdvanced = hasAdvancedFields(payload);
        if (wantsAdvanced && !isProPlus) {
            throw new Error("PRO_PLUS_REQUIRED");
        }
    }
    return user;
}
function listProjects(userId) {
    return db_1.prisma.project.findMany({
        where: { userId },
        include: projectInclude,
        orderBy: { updatedAt: "desc" },
    });
}
function getProjectById(userId, id) {
    return db_1.prisma.project.findFirst({
        where: { id, userId },
        include: projectInclude,
    });
}
async function createProject(userId, payload) {
    await assertPlanRules(userId, payload);
    const { depreciationAssets, ...data } = payload;
    return db_1.prisma.project.create({
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
    });
}
async function updateProject(userId, id, payload) {
    const exists = await db_1.prisma.project.findFirst({ where: { id, userId } });
    if (!exists)
        return null;
    // 🔒 gate aussi en update !
    await assertPlanRules(userId, payload);
    const { depreciationAssets, ...data } = payload;
    await db_1.prisma.project.update({
        where: { id },
        data: {
            ...data,
        },
        include: projectInclude,
    });
    // Replace assets if provided (simple & safe)
    if (depreciationAssets) {
        await db_1.prisma.depreciationAsset.deleteMany({ where: { projectId: id } });
        if (depreciationAssets.length) {
            await db_1.prisma.depreciationAsset.createMany({
                data: depreciationAssets.map((a) => ({
                    projectId: id,
                    category: a.category,
                    label: a.label,
                    amount: a.amount,
                    years: a.years,
                })),
            });
        }
    }
    // Return fresh with assets
    return db_1.prisma.project.findFirst({
        where: { id, userId },
        include: projectInclude,
    });
}
async function deleteProject(userId, id) {
    const result = await db_1.prisma.project.deleteMany({
        where: { id, userId },
    });
    return result.count > 0;
}
