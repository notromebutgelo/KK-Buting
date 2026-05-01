import { Response } from "express";
import { createUser, getUserById } from "./user.service";
import { AuthRequest } from "../../middleware/verifyToken";
import {
  getMerchantPasswordRequirement,
  markMerchantPasswordChanged,
  syncMerchantPasswordRequirement,
} from "./merchantPasswordPolicy.service";

type AuthUserResponse = {
  uid: string;
  email?: string;
  role?: string;
  UserName?: string;
  createdAt?: string;
  mustChangePassword?: boolean;
};

async function buildAuthUserResponse(
  req: AuthRequest,
  storedUser?: Record<string, any> | null
): Promise<AuthUserResponse> {
  const uid = String(storedUser?.uid || storedUser?.id || req.user?.uid || "");
  const role = String(storedUser?.role || req.user?.role || "");
  const mustChangePassword =
    role === "merchant" && uid ? await getMerchantPasswordRequirement(uid) : false;

  return {
    uid,
    email: storedUser?.email || req.user?.email,
    role,
    UserName:
      storedUser?.UserName ||
      storedUser?.username ||
      req.user?.email?.split("@")[0] ||
      "user",
    createdAt: storedUser?.createdAt ? String(storedUser.createdAt) : undefined,
    mustChangePassword,
  };
}

export async function registerUser(req: AuthRequest, res: Response) {
  const uid = req.user?.uid;
  const email = req.user?.email || req.body.email;
  const userName = req.body.username || req.body.UserName || "";

  if (!uid || !email) {
    return res.status(400).json({ error: "Authenticated uid and email are required" });
  }

  try {
    const existing = await getUserById(uid);

    if (!existing) {
      await createUser(uid, { UserName: userName, email });
    }

    const user = await getUserById(uid);
    return res.status(existing ? 200 : 201).json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function loginUser(req: AuthRequest, res: Response) {
  const uid = req.user?.uid;

  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await getUserById(uid);

    if (!user) {
      if (req.user?.role) {
        const fallbackUser = await buildAuthUserResponse(req, {
          uid,
          email: req.user.email,
          role: req.user.role,
          UserName: req.user.email?.split("@")[0] || "admin",
        });
        return res.json({ user: fallbackUser });
      }
      return res.status(404).json({ error: "User not found" });
    }

    const storedRole = String(user.role || req.user?.role || "");
    if (storedRole === "merchant") {
      const password = String(req.body?.password || "");
      if (password) {
        await syncMerchantPasswordRequirement(uid, password);
      }
    }

    const normalizedUser = await buildAuthUserResponse(req, user);
    return res.json({ user: normalizedUser });
  } catch (err: any) {
    if (req.user?.role) {
      const fallbackUser = await buildAuthUserResponse(req, {
        uid,
        email: req.user.email,
        role: req.user.role,
        UserName: req.user.email?.split("@")[0] || "admin",
      });
      return res.json({ user: fallbackUser });
    }
    return res.status(500).json({ error: err.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await getUserById(req.user!.uid);
    if (!user) {
      if (req.user?.role) {
        const fallbackUser = await buildAuthUserResponse(req, {
          uid: req.user.uid,
          email: req.user.email,
          role: req.user.role,
          UserName: req.user.email?.split("@")[0] || "admin",
        });
        return res.json(fallbackUser);
      }
      return res.status(404).json({ error: "User not found" });
    }
    const normalizedUser = await buildAuthUserResponse(req, user);
    return res.json(normalizedUser);
  } catch (err: any) {
    if (req.user?.role) {
      const fallbackUser = await buildAuthUserResponse(req, {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        UserName: req.user.email?.split("@")[0] || "admin",
      });
      return res.json(fallbackUser);
    }
    return res.status(500).json({ error: err.message });
  }
}

export async function markMerchantPasswordChangedHandler(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "merchant") {
      return res.status(403).json({ error: "Only merchant accounts can update this setting." });
    }

    await markMerchantPasswordChanged(req.user.uid);
    return res.json({ message: "Merchant password change acknowledged." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
