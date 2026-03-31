import { Response } from "express";
import { createUser, getUserById } from "./user.service";
import { AuthRequest } from "../../middleware/verifyToken";

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
        return res.json({
          user: {
            uid,
            email: req.user.email,
            role: req.user.role,
            UserName: req.user.email?.split("@")[0] || "admin",
          },
        });
      }
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    if (req.user?.role) {
      return res.json({
        user: {
          uid,
          email: req.user.email,
          role: req.user.role,
          UserName: req.user.email?.split("@")[0] || "admin",
        },
      });
    }
    return res.status(500).json({ error: err.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await getUserById(req.user!.uid);
    if (!user) {
      if (req.user?.role) {
        return res.json({
          uid: req.user.uid,
          email: req.user.email,
          role: req.user.role,
          UserName: req.user.email?.split("@")[0] || "admin",
        });
      }
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(user);
  } catch (err: any) {
    if (req.user?.role) {
      return res.json({
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        UserName: req.user.email?.split("@")[0] || "admin",
      });
    }
    return res.status(500).json({ error: err.message });
  }
}
