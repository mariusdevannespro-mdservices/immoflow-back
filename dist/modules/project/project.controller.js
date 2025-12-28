"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProjects = getUserProjects;
exports.getProject = getProject;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.downloadProjectPdf = downloadProjectPdf;
exports.deleteProject = deleteProject;
const project_dto_1 = require("./project.dto");
const service = __importStar(require("./project.service"));
const project_pdf_template_1 = require("./project.pdf.template");
const project_pdf_service_1 = require("./project.pdf.service");
const project_results_1 = require("./project.results");
async function getUserProjects(req, res, next) {
    try {
        const projects = await service.listProjects(req.user.id);
        res.json(projects);
    }
    catch (e) {
        next(e);
    }
}
async function getProject(req, res, next) {
    try {
        const project = await service.getProjectById(req.user.id, req.params.id);
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        res.json(project);
    }
    catch (e) {
        next(e);
    }
}
async function createProject(req, res) {
    try {
        const payload = (0, project_dto_1.parseProjectPayload)(req.body);
        if (!payload.name || !payload.city) {
            return res.status(400).json({ error: "name and city are required" });
        }
        const project = await service.createProject(req.user.id, payload);
        res.status(201).json(project);
    }
    catch (e) {
        if (e.message === "FREE_LIMIT_REACHED") {
            return res.status(403).json({
                error: "FREE_LIMIT_REACHED",
                message: "Le plan gratuit est limité à un seul projet.",
            });
        }
        if (e.message === "PRO_PLUS_REQUIRED") {
            return res.status(403).json({
                error: "PRO_PLUS_REQUIRED",
                message: "Les charges détaillées / fiscalité avancée sont réservées au plan Pro+.",
            });
        }
        res.status(400).json({ error: e?.message ?? "Bad request" });
    }
}
async function updateProject(req, res) {
    try {
        const payload = (0, project_dto_1.parseProjectPayload)(req.body);
        const updated = await service.updateProject(req.user.id, req.params.id, payload);
        if (!updated)
            return res.status(404).json({ error: "Project not found" });
        res.json(updated);
    }
    catch (e) {
        if (e.message === "PRO_PLUS_REQUIRED") {
            return res.status(403).json({
                error: "PRO_PLUS_REQUIRED",
                message: "Les charges détaillées / fiscalité avancée sont réservées au plan Pro+.",
            });
        }
        res.status(400).json({ error: e?.message ?? "Bad request" });
    }
}
async function downloadProjectPdf(req, res, next) {
    try {
        const project = await service.getProjectById(req.user.id, req.params.id);
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        const details = req.query.details === "1" || req.query.details === "true";
        const confidential = req.query.confidential === "1" || req.query.confidential === "true";
        const charts = req.query.charts === "1" || req.query.charts === "true";
        const results = (0, project_results_1.computeProjectResults)(project);
        const html = (0, project_pdf_template_1.renderProjectPdfHtml)(project, results, { details, confidential, charts });
        const pdfBuffer = await (0, project_pdf_service_1.htmlToPdfBuffer)(html);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="immoflow-${project.id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (e) {
        next(e);
    }
}
async function deleteProject(req, res, next) {
    try {
        const ok = await service.deleteProject(req.user.id, req.params.id);
        if (!ok)
            return res.status(404).json({ error: "Project not found" });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
}
