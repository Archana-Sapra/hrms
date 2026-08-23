import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { uploadDocumentSchema } from "../validators/hr.schemas.js";
import express, { type Router } from "express";
import { uploadDocument, getEmployeeDocuments, deleteDocument, handleUpload } from "../controllers/document.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/upload", authMiddleware(), handleUpload, validateBody(uploadDocumentSchema), uploadDocument);
router.get("/employee/:employeeId", authMiddleware(), getEmployeeDocuments);
router.delete("/:id", authMiddleware(), deleteDocument);

export default router;
