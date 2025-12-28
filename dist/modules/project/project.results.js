"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProjectResults = computeProjectResults;
const round2 = (n) => Math.round(n * 100) / 100;
function monthlyPayment(principal, annualRatePct, years) {
    const r = (annualRatePct / 100) / 12;
    const n = years * 12;
    if (principal <= 0 || n <= 0)
        return 0;
    if (r === 0)
        return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}
function safePct(p) {
    return (p ?? 0) / 100;
}
function annualizeMonthly(m) {
    return m * 12;
}
function computeAnnualDepreciation(assets) {
    if (!assets?.length)
        return 0;
    return assets.reduce((sum, a) => {
        const years = a.years || 0;
        if (years <= 0)
            return sum;
        return sum + a.amount / years;
    }, 0);
}
/**
 * ⚠️ Fiscalité simplifiée:
 * - Micro-BIC: abattement 50% (LMNP meublé)
 * - Réel: loyers - charges déductibles - intérêts (approx 1ère année) - amortissements
 * - Impôt = max(0, résultat) * (TMI + PS)
 */
function computeProjectResults(project) {
    const notaryFees = project.notaryFees ?? 0;
    const renovationCosts = project.renovationCosts ?? 0;
    const investmentTotal = project.price + notaryFees + renovationCosts;
    // --- Revenus ---
    const vacancyRate = safePct(project.vacancyRate);
    const baseRentNetVacancy = project.monthlyRent * (1 - vacancyRate);
    // Si le loyer est hors charges et que tu encaisses des charges récupérables, tu peux les ajouter en revenu
    const recoverableCharges = project.rentChargesIncluded ? 0 : (project.recoverableChargesMonthly ?? 0);
    const otherIncome = project.otherIncomeMonthly ?? 0;
    const monthlyIncome = baseRentNetVacancy + recoverableCharges + otherIncome;
    // --- Charges ---
    const monthlyChargesBase = (project.propertyTax ?? 0) / 12 +
        (project.coOwnershipFees ?? 0) / 12 +
        (project.insurance ?? 0) / 12 +
        (project.maintenance ?? 0) / 12;
    const managementMonthly = project.propertyManagementFeeMonthly ??
        (project.propertyManagementFeeRate ? (monthlyIncome * (project.propertyManagementFeeRate / 100)) : 0);
    const monthlyChargesExtra = managementMonthly +
        (project.rentGuaranteeInsuranceMonthly ?? 0) +
        (project.accountingFeesAnnual ?? 0) / 12 +
        (project.expectedCapexAnnual ?? 0) / 12;
    const monthlyCharges = monthlyChargesBase + monthlyChargesExtra;
    // --- Prêt ---
    const monthlyLoan = monthlyPayment(project.loanAmount, project.interestRate, project.duration);
    // Cashflow avant impôts
    const monthlyCashflowBeforeTax = monthlyIncome - monthlyCharges - monthlyLoan;
    // --- Fiscalité ---
    const tmi = (project.user?.tmi ?? 30) / 100;
    const ps = project.user?.socialContribRate ?? 0.172;
    const taxRate = tmi + ps;
    const annualIncome = annualizeMonthly(monthlyIncome);
    // Déductibles (réel) : charges (hors récupérables), comptable, gestion, GLI, TF, etc.
    // Ici on prend toutes tes charges calculées (simplification).
    const annualDeductibleCharges = annualizeMonthly(monthlyCharges);
    // Intérêts 1ère année (approx)
    const annualInterestApprox = project.loanAmount * (project.interestRate / 100);
    // Amortissements (réel)
    const annualDepreciation = computeAnnualDepreciation(project.depreciationAssets);
    let annualTaxableIncome = 0;
    if (project.taxMode === "micro") {
        const abatement = 0.5; // micro-BIC LMNP classique
        annualTaxableIncome = annualIncome * (1 - abatement);
    }
    else {
        annualTaxableIncome = annualIncome - annualDeductibleCharges - annualInterestApprox - annualDepreciation;
    }
    const annualTax = Math.max(0, annualTaxableIncome) * taxRate;
    const monthlyTax = annualTax / 12;
    const monthlyCashflowAfterTax = monthlyCashflowBeforeTax - monthlyTax;
    const grossYieldPct = investmentTotal > 0 ? (annualIncome / investmentTotal) * 100 : 0;
    return {
        investmentTotal: round2(investmentTotal),
        monthlyIncome: round2(monthlyIncome),
        monthlyCharges: round2(monthlyCharges),
        monthlyLoan: round2(monthlyLoan),
        annualTaxableIncome: round2(annualTaxableIncome),
        annualDepreciation: round2(annualDepreciation),
        annualTax: round2(annualTax),
        monthlyTax: round2(monthlyTax),
        monthlyCashflowBeforeTax: round2(monthlyCashflowBeforeTax),
        monthlyCashflowAfterTax: round2(monthlyCashflowAfterTax),
        grossYieldPct: round2(grossYieldPct),
    };
}
