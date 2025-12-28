import { Router } from "express"
import { checkJwt } from "../../middlewares/auth.middleware"
import { attachUser } from "../../middlewares/attachUser.middleware"
import {
  createProject,
  updateProject,
  getProject,
  getUserProjects,
  downloadProjectPdf,
  deleteProject,
} from "./project.controller"

const router = Router()

router.use(checkJwt, attachUser)

router.get("/projects", getUserProjects)
router.get("/projects/:id", getProject)
router.post("/projects", createProject)
router.put("/projects/:id", updateProject)
router.get("/projects/:id/pdf", downloadProjectPdf)
router.delete("/projects/:id", deleteProject)

export default router
