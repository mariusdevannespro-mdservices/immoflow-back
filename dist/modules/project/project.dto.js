"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProjectPayload = parseProjectPayload;
const num = (v, field) => {
    const n = Number(v);
    if (v === "" || v === null || v === undefined || Number.isNaN(n)) {
        throw new Error(`Invalid number for ${field}`);
    }
    return n;
};
const optNum = (v) => {
    if (v === "" || v === null || v === undefined)
        return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
};
const bool = (v) => {
    if (typeof v === "boolean")
        return v;
    if (v === "true" || v === "1" || v === 1)
        return true;
    if (v === "false" || v === "0" || v === 0)
        return false;
    return Boolean(v);
};
const str = (v) => String(v ?? "").trim();
function parseTaxMode(v) {
    const s = String(v ?? "micro").toLowerCase();
    return s === "real" ? "real" : "micro";
}
function parseAssets(v) {
    if (!v)
        return undefined;
    if (!Array.isArray(v))
        throw new Error("depreciationAssets must be an array");
    const out = v.map((a, i) => {
        const category = String(a?.category ?? "").toLowerCase();
        if (!["building", "works", "furniture", "fees"].includes(category)) {
            throw new Error(`Invalid depreciationAssets[${i}].category`);
        }
        const label = str(a?.label);
        if (!label)
            throw new Error(`Invalid depreciationAssets[${i}].label`);
        const amount = num(a?.amount, `depreciationAssets[${i}].amount`);
        const years = num(a?.years, `depreciationAssets[${i}].years`);
        if (years <= 0)
            throw new Error(`Invalid depreciationAssets[${i}].years`);
        return { category: category, label, amount, years };
    });
    return out;
}
function parseProjectPayload(body) {
    return {
        name: str(body.name),
        city: str(body.city),
        propertyType: str(body.propertyType || "apartment"),
        price: num(body.price, "price"),
        notaryFees: optNum(body.notaryFees),
        renovationCosts: optNum(body.renovationCosts),
        landShareRate: body.landShareRate != null
            ? num(body.landShareRate, "landShareRate") / 100
            : null,
        contribution: num(body.contribution, "contribution"),
        loanAmount: num(body.loanAmount, "loanAmount"),
        interestRate: num(body.interestRate, "interestRate"),
        duration: num(body.duration, "duration"),
        monthlyRent: num(body.monthlyRent, "monthlyRent"),
        vacancyRate: optNum(body.vacancyRate),
        rentChargesIncluded: bool(body.rentChargesIncluded),
        recoverableChargesMonthly: optNum(body.recoverableChargesMonthly),
        otherIncomeMonthly: optNum(body.otherIncomeMonthly),
        propertyTax: optNum(body.propertyTax),
        coOwnershipFees: optNum(body.coOwnershipFees),
        insurance: optNum(body.insurance),
        maintenance: optNum(body.maintenance),
        propertyManagementFeeRate: optNum(body.propertyManagementFeeRate),
        propertyManagementFeeMonthly: optNum(body.propertyManagementFeeMonthly),
        rentGuaranteeInsuranceMonthly: optNum(body.rentGuaranteeInsuranceMonthly),
        accountingFeesAnnual: optNum(body.accountingFeesAnnual),
        expectedCapexAnnual: optNum(body.expectedCapexAnnual),
        taxMode: parseTaxMode(body.taxMode),
        furnished: bool(body.furnished),
        depreciationAssets: parseAssets(body.depreciationAssets),
    };
}
