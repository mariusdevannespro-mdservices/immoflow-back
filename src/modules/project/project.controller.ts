import type { Request, Response, NextFunction } from "express"
import { parseProjectPayload } from "./project.dto"
import * as service from "./project.service"
import { renderProjectPdfHtml } from "./project.pdf.template"
import { htmlToPdfBuffer } from "./project.pdf.service"
import { computeProjectResults } from "./project.results"

export async function getUserProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await service.listProjects(req.user!.id)
    res.json(projects)
  } catch (e) {
    next(e)
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.getProjectById(req.user!.id, req.params.id)
    if (!project) return res.status(404).json({ error: "Project not found" })
    res.json(project)
  } catch (e) {
    next(e)
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const payload = parseProjectPayload(req.body)
    if (!payload.name || !payload.city) {
      return res.status(400).json({ error: "name and city are required" })
    }

    const project = await service.createProject(req.user!.id, payload)
    res.status(201).json(project)
  } catch (e: any) {
    if (e.message === "FREE_LIMIT_REACHED") {
      return res.status(403).json({
        error: "FREE_LIMIT_REACHED",
        message: "Le plan gratuit est limité à un seul projet.",
      })
    }

    if (e.message === "PRO_PLUS_REQUIRED") {
      return res.status(403).json({
        error: "PRO_PLUS_REQUIRED",
        message: "Les charges détaillées / fiscalité avancée sont réservées au plan Pro+.",
      })
    }

    res.status(400).json({ error: e?.message ?? "Bad request" })
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const payload = parseProjectPayload(req.body)
    const updated = await service.updateProject(req.user!.id, req.params.id, payload)
    if (!updated) return res.status(404).json({ error: "Project not found" })
    res.json(updated)
  } catch (e: any) {
    if (e.message === "PRO_PLUS_REQUIRED") {
      return res.status(403).json({
        error: "PRO_PLUS_REQUIRED",
        message: "Les charges détaillées / fiscalité avancée sont réservées au plan Pro+.",
      })
    }

    res.status(400).json({ error: e?.message ?? "Bad request" })
  }
}

export async function downloadProjectPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.getProjectById(req.user!.id, req.params.id)
    if (!project) return res.status(404).json({ error: "Project not found" })

    const details = req.query.details === "1" || req.query.details === "true"
    const confidential = req.query.confidential === "1" || req.query.confidential === "true"
    const charts = req.query.charts === "1" || req.query.charts === "true"

    const results = computeProjectResults(project as any)
    const html = renderProjectPdfHtml(project as any, results, { details, confidential, charts })
    const pdfBuffer = await htmlToPdfBuffer(html)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="immoflow-${project.id}.pdf"`)
    res.send(pdfBuffer)
  } catch (e) {
    next(e)
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const ok = await service.deleteProject(req.user!.id, req.params.id)
    if (!ok) return res.status(404).json({ error: "Project not found" })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
}
