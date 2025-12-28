"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProjectPdfHtml = renderProjectPdfHtml;
const eur = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
function renderProjectPdfHtml(project, results, opts = {}) {
    const today = new Date().toLocaleDateString("fr-FR");
    const details = !!opts.details;
    const confidential = !!opts.confidential;
    const mask = (value, sensitive) => (confidential && sensitive ? "—" : value);
    const investmentTotal = (results?.investmentTotal ??
        project.price + (project.notaryFees ?? 0) + (project.renovationCosts ?? 0)) || 0;
    const verdict = !results
        ? null
        : results.monthlyCashflowAfterTax >= 100
            ? "good"
            : results.monthlyCashflowAfterTax >= 0
                ? "medium"
                : "bad";
    const verdictLabel = verdict === "good" ? "Bon deal" : verdict === "medium" ? "Moyen" : verdict === "bad" ? "Mauvais deal" : "";
    const verdictClass = verdict === "good"
        ? "verdictGood"
        : verdict === "medium"
            ? "verdictMedium"
            : verdict === "bad"
                ? "verdictBad"
                : "";
    const depreciationAssets = (project.depreciationAssets ?? []);
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rapport - ${escapeHtml(project.name ?? "Projet")}</title>
  <style>
    :root{
      --bg: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --muted2:#9ca3af;
      --border:#e5e7eb;
      --panel:#f9fafb;
      --emerald:#059669;

      --goodBg:#ecfdf5; --goodBorder:#a7f3d0; --goodText:#047857;
      --medBg:#fffbeb; --medBorder:#fde68a; --medText:#a16207;
      --badBg:#fef2f2; --badBorder:#fecaca; --badText:#b91c1c;

      --grayCard:#f3f4f6;
    }

    *{ box-sizing: border-box; }
    body{
      margin:0;
      padding: 32px;
      font-family: Arial, sans-serif;
      color: var(--text);
      background: var(--bg);
    }
    .page{ width:100%; max-width: 820px; margin: 0 auto; }
    .paper{
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 28px;
      background: var(--panel);
    }
    .center{ text-align:center; }
    .title{ font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: .2px; }
    .subtitle{ font-size: 13px; color: var(--muted); margin: 0; }
    .date{ font-size: 12px; color: var(--muted2); margin-top: 10px; }
    .hr{ height: 1px; background: var(--border); margin: 18px 0 22px; }

    .section{ margin-top: 16px; padding-top: 6px; }
    .sectionTitle{ font-size: 14px; font-weight: 700; margin: 0 0 10px; }

    .grid2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }

    .verdict{
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .verdictLabel{ font-size: 12px; opacity:.8; margin-bottom: 4px; }
    .verdictValue{ font-size: 18px; font-weight: 700; margin: 0; }

    .verdictGood{ background: var(--goodBg); border-color: var(--goodBorder); color: var(--goodText); }
    .verdictMedium{ background: var(--medBg); border-color: var(--medBorder); color: var(--medText); }
    .verdictBad{ background: var(--badBg); border-color: var(--badBorder); color: var(--badText); }

    .kpiGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
    .kpiBox{
      background: rgba(255,255,255,.65);
      border: 1px solid rgba(0,0,0,.06);
      border-radius: 10px;
      padding: 10px;
      color: inherit;
    }
    .kpiLabel{ font-size: 11px; opacity:.8; }
    .kpiValue{ font-size: 16px; font-weight: 700; margin-top: 4px; }

    .grayBox{
      background: var(--grayCard);
      border-radius: 12px;
      padding: 14px;
      border: 1px solid #eee;
    }
    .grayLabel{ font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .grayValue{ font-size: 18px; font-weight: 700; margin: 0; color: var(--text); }
    .grayValue.em{ color: var(--emerald); }
    .help{ font-size: 11px; color: var(--muted2); margin-top: 4px; }

    .line{
      display:flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      padding: 7px 0;
      color: var(--muted);
    }
    .line + .line{ border-top: 1px solid #f1f5f9; }
    .line span:last-child{
      color: var(--text);
      font-weight: 600;
      text-align:right;
      white-space: nowrap;
    }

    .highlight{
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      font-weight: 700;
      color: var(--text);
    }
    .highlight span:last-child{ color: var(--emerald); }

    .asset{
      display:flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      background: var(--grayCard);
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 10px;
      margin-top: 8px;
    }
    .assetTitle{ font-weight: 700; max-width: 420px; }
    .assetMeta{ font-size: 11px; color: var(--muted2); margin-top: 3px; }
    .assetRight{ text-align:right; }
    .assetAmount{ font-weight: 700; }
    .assetPerYear{ font-size: 11px; color: var(--muted2); margin-top: 3px; }

    .footer{
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--muted2);
      line-height: 1.45;
    }

    @media print{
      body{ padding:0; }
      .paper{ border:none; border-radius:0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="paper">

      <div class="center">
        <div class="title">Rapport d'Analyse d'Investissement</div>
        <p class="subtitle">${escapeHtml(project.propertyType ?? "")} • ${escapeHtml(project.city ?? "")} • ${(project.taxMode ?? "micro").toUpperCase()}</p>
        <div class="date">Généré le ${today}</div>
      </div>

      <div class="hr"></div>

      ${results
        ? `
      <div class="verdict ${verdictClass}">
        <div class="verdictLabel">Verdict</div>
        <p class="verdictValue">${escapeHtml(verdictLabel)}</p>

        <div class="kpiGrid">
          <div class="kpiBox">
            <div class="kpiLabel">${details ? "Cashflow net (après impôts)" : "Cashflow (avant impôts)"}</div>
            <div class="kpiValue">${escapeHtml(mask(`${Math.round(details ? results.monthlyCashflowAfterTax : results.monthlyCashflowBeforeTax)}€/mo`, true))}</div>
          </div>
          ${details
            ? `
          <div class="kpiBox">
            <div class="kpiLabel">Impôts estimés</div>
            <div class="kpiValue">${escapeHtml(mask(`${Math.round(results.monthlyTax)}€/mo`, true))}</div>
          </div>
          `
            : `
          <div class="kpiBox">
            <div class="kpiLabel">Rendement brut</div>
            <div class="kpiValue">${escapeHtml(`${Math.round(results.grossYieldPct * 10) / 10}%`)}</div>
          </div>
          `}
        </div>
      </div>
      `
        : `
      <div class="verdict">
        <div class="verdictLabel">Projet</div>
        <p class="verdictValue">${escapeHtml(project.name ?? "")}</p>
      </div>
      `}

      <div class="grid2">
        <div class="grayBox">
          <div class="grayLabel">Revenus (mensuel)</div>
          <p class="grayValue em">${escapeHtml(mask(eur(results?.monthlyIncome ?? 0), true))}</p>
        </div>
        <div class="grayBox">
          <div class="grayLabel">Mensualité prêt</div>
          <p class="grayValue">${escapeHtml(mask(eur(results?.monthlyLoan ?? 0), true))}</p>
          <div class="help">${escapeHtml(`${project.interestRate ?? 0}% • ${project.duration ?? 0} ans`)}</div>
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">Caractéristiques du bien</div>
        ${detailLine("Prix d'achat", mask(eur(project.price ?? 0), true))}
        ${detailLine("Frais de notaire", mask(eur(project.notaryFees ?? 0), true))}
        ${detailLine("Travaux", mask(eur(project.renovationCosts ?? 0), true))}
        ${detailLine("Part terrain (non amortissable)", `${Math.round(((project.landShareRate ?? 0.15) * 100))}%`)}
        ${detailLine("Total investissement", mask(eur(investmentTotal), true), true)}
      </div>

      <div class="section">
        <div class="sectionTitle">Financement</div>
        ${detailLine("Apport", mask(eur(project.contribution ?? 0), true))}
        ${detailLine("Emprunt", mask(eur(project.loanAmount ?? 0), true))}
        ${detailLine("Taux", `${project.interestRate ?? 0}%`)}
        ${detailLine("Durée", `${project.duration ?? 0} ans`)}
      </div>

      <div class="section">
        <div class="sectionTitle">Revenus locatifs</div>
        ${detailLine("Loyer mensuel", mask(eur(project.monthlyRent ?? 0), true))}
        ${detailLine("Vacance locative", `${project.vacancyRate ?? 0}%`)}
        ${detailLine("Loyer charges comprises", project.rentChargesIncluded ? "Oui" : "Non")}
        ${detailLine("Charges récupérables", mask(eur(project.recoverableChargesMonthly ?? 0), true))}
        ${detailLine("Autres revenus", mask(eur(project.otherIncomeMonthly ?? 0), true))}
        ${results ? detailLine("Revenus mensuels (corrigés)", mask(eur(results.monthlyIncome), true), true) : ""}
      </div>

      ${details && results
        ? `
      <div class="section">
        <div class="sectionTitle">Charges</div>
        ${detailLine("Taxe foncière", mask(eur(project.propertyTax ?? 0), true))}
        ${detailLine("Copropriété", mask(eur(project.coOwnershipFees ?? 0), true))}
        ${detailLine("Assurance PNO", mask(eur(project.insurance ?? 0), true))}
        ${detailLine("Entretien / provisions", mask(eur(project.maintenance ?? 0), true))}

        ${detailLine("Gestion locative (fixe)", project.propertyManagementFeeMonthly != null ? mask(eur(project.propertyManagementFeeMonthly), true) : "—")}
        ${detailLine("Gestion locative (taux)", project.propertyManagementFeeRate != null ? `${project.propertyManagementFeeRate}%` : "—")}
        ${detailLine("Gestion locative (calculée)", mask(eur(results.managementMonthly ?? 0), true))}

        ${detailLine("Assurance loyers impayés (GLI)", mask(eur(project.rentGuaranteeInsuranceMonthly ?? 0), true))}
        ${detailLine("Frais comptable (annuel)", mask(eur(project.accountingFeesAnnual ?? 0), true))}
        ${detailLine("Capex lissé (annuel)", mask(eur(project.expectedCapexAnnual ?? 0), true))}

        ${detailLine("Charges mensuelles totales", mask(eur(results.monthlyCharges), true), true)}
      </div>

      <div class="section">
        <div class="sectionTitle">Fiscalité (estimations)</div>
        ${detailLine("Mode fiscal", (project.taxMode ?? "micro").toUpperCase())}
        ${detailLine("Meublé", project.furnished ? "Oui" : "Non")}
        ${detailLine("TMI", `${project.user?.tmi ?? 30}%`)}
        ${detailLine("Prélèvements sociaux", `${Math.round(((project.user?.socialContribRate ?? 0.172) * 1000)) / 10}%`)}
        ${detailLine("Revenu imposable (annuel)", mask(eur(results.annualTaxableIncome), true))}
        ${detailLine("Impôt (annuel)", mask(eur(results.annualTax), true))}
        ${detailLine("Impôt (mensuel)", mask(eur(results.monthlyTax), true), true)}
      </div>

      ${(project.taxMode ?? "micro") === "real"
            ? `
      <div class="section">
        <div class="sectionTitle">Amortissements (LMNP réel)</div>
        ${detailLine("Amortissements annuels (total)", mask(eur(results.annualDepreciation), true), true)}

        ${depreciationAssets.length === 0
                ? `<div class="help">Aucune ligne d’amortissement enregistrée.</div>`
                : depreciationAssets
                    .map((a) => {
                    const perYear = a.years > 0 ? a.amount / a.years : 0;
                    return `
          <div class="asset">
            <div>
              <div class="assetTitle">${escapeHtml(a.label)}</div>
              <div class="assetMeta">${escapeHtml(a.category)} • ${escapeHtml(String(a.years))} ans</div>
            </div>
            <div class="assetRight">
              <div class="assetAmount">${escapeHtml(mask(eur(a.amount), true))}</div>
              <div class="assetPerYear">${escapeHtml(mask(`${eur(perYear)}/an`, true))}</div>
            </div>
          </div>`;
                })
                    .join("")}
      </div>
      `
            : ""}

      <div class="section">
        <div class="sectionTitle">Résumé financier</div>
        ${detailLine("Cashflow avant impôts", mask(eur(results.monthlyCashflowBeforeTax), true))}
        ${detailLine("Cashflow après impôts", mask(eur(results.monthlyCashflowAfterTax), true), true)}
      </div>
      `
        : `
      <div class="section">
        <div class="sectionTitle">Résumé financier</div>
        ${results ? detailLine("Cashflow (avant impôts)", mask(eur(results.monthlyCashflowBeforeTax), true), true) : ""}
      </div>
      `}

      <div class="footer">
        <div>Ce rapport a été généré par ImmoFlow</div>
        <div>Les calculs sont fournis à titre indicatif.</div>
      </div>

    </div>
  </div>
</body>
</html>`;
}
function detailLine(label, value, highlight = false) {
    return `
    <div class="line ${highlight ? "highlight" : ""}">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}
function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
