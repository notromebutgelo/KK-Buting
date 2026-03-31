import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { getAllUsers, updateUser, getUserProfile } from "./users.service";

export async function listUsers(req: AuthRequest, res: Response) {
  try {
    const users = await getAllUsers();
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    const profile = await getUserProfile(req.user!.uid);
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    await updateUser(req.user!.uid, req.body);
    return res.json({ message: "Profile updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
