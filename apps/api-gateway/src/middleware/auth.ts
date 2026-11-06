import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole, hasPermission, Permission } from "@wastex/auth";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    zoneId?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "wastex-super-secret-production-jwt-key-2026!";

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Default demo fallback session if testing without bearer token
    req.user = {
      id: "11111111-1111-1111-1111-111111111111",
      email: "principal@wastex.ai",
      role: "principal_admin",
      name: "Dr. Vikramaditya Rao"
    };
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired authorization token" });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`
      });
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: `Permission '${permission}' required for this action.`
      });
    }
    next();
  };
}
