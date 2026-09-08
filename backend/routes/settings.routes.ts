import { validateBody, validateQuery } from "../middlewares/zodValidation.middleware.js";
import { updateGlobalSettingsSchema, updateDepartmentSettingsSchema, createDepartmentSchema, renameDepartmentSchema, assignEmployeeToDepartmentSchema, getEffectiveSettingsQuerySchema, runRegularizationCleanupSchema } from "../validators/settings.schemas.js";
import { Router } from "express";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getDepartmentSettings,
  updateDepartmentSettings,
  deleteDepartmentSettings,
  getEffectiveSettings,
  getDepartments,
  getDepartmentStats,
  addDepartment,
  renameDepartment,
  deleteDepartment,
  assignEmployeeToDepartment,
  getAvailableEmployees,
  rescheduleDailyHrAttendanceReport,
  testDailyHrAttendanceReport,
  runRegularizationCleanup
} from "../controllers/settings.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Global settings routes (HR/Admin only)
router.get("/global", authMiddleware(["admin", "hr"]), getGlobalSettings);
router.put("/global", authMiddleware(["admin", "hr"]), validateBody(updateGlobalSettingsSchema), updateGlobalSettings);

// Department settings routes (HR/Admin only)
router.get("/department/:department", authMiddleware(["admin", "hr"]), getDepartmentSettings);
router.put("/department/:department", authMiddleware(["admin", "hr"]), validateBody(updateDepartmentSettingsSchema), updateDepartmentSettings);
router.delete("/department/:department", authMiddleware(["admin", "hr"]), deleteDepartmentSettings);

// Effective settings (merged department + global) - can be used by all roles
router.get("/effective", authMiddleware(["admin", "hr", "employee"]), validateQuery(getEffectiveSettingsQuerySchema), getEffectiveSettings);

// Utility routes
router.get("/departments/list", authMiddleware(["admin", "hr"]), getDepartments);

// Department management routes (HR/Admin only)
router.get("/departments/stats", authMiddleware(["admin", "hr"]), getDepartmentStats);
router.post("/departments", authMiddleware(["admin", "hr"]), validateBody(createDepartmentSchema), addDepartment);
router.put("/departments/:oldName/rename", authMiddleware(["admin", "hr"]), validateBody(renameDepartmentSchema), renameDepartment);
router.delete("/departments/:name", authMiddleware(["admin", "hr"]), deleteDepartment);

// Employee-department assignment routes (HR/Admin only)
router.get("/departments/:departmentName/employees", authMiddleware(["admin", "hr"]), getAvailableEmployees);
router.post("/departments/:departmentName/employees", authMiddleware(["admin", "hr"]), validateBody(assignEmployeeToDepartmentSchema), assignEmployeeToDepartment);

// Daily HR Attendance Report routes (HR/Admin only)
router.post("/daily-hr-attendance-report/reschedule", authMiddleware(["admin", "hr"]), rescheduleDailyHrAttendanceReport);
router.post("/daily-hr-attendance-report/test", authMiddleware(["admin", "hr"]), testDailyHrAttendanceReport);

// Regularization retention routes (HR/Admin only)
router.post("/regularization-retention/run-now", authMiddleware(["admin", "hr"]), validateBody(runRegularizationCleanupSchema), runRegularizationCleanup);

export default router;
