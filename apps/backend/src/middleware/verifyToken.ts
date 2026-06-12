import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebase";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    let role = decoded.role as string | undefined;
    let storedUser: FirebaseFirestore.DocumentData | undefined;

    // Fall back to Firestore when the token has no role claim.
    // This covers existing users registered before setCustomUserClaims was added.
    if (!role) {
      const snap = await db.collection("users").doc(decoded.uid).get();
      if (snap.exists) {
        storedUser = snap.data();
        role = storedUser?.role as string | undefined;
      }
    }

    if (role === "admin" || role === "superadmin") {
      if (!storedUser) {
        const snap = await db.collection("users").doc(decoded.uid).get();
        storedUser = snap.exists ? snap.data() : undefined;
      }

      const accountStatus = String(storedUser?.adminStatus || storedUser?.accountStatus || "").trim();
      if (accountStatus === "disabled" || storedUser?.disabled === true) {
        return res.status(403).json({ error: "This admin account has been disabled." });
      }
    }

    req.user = { uid: decoded.uid, email: decoded.email, role };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}
