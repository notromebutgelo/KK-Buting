import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { submitProfiling, getProfiling, updateProfiling } from "./profiling.service";

export async function submitProfilingHandler(req: AuthRequest, res: Response) {
  try {
    await submitProfiling(req.user!.uid, req.body);
    return res.status(201).json({ message: "Profiling submitted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getProfilingHandler(req: AuthRequest, res: Response) {
  try {
    const profile = await getProfiling(req.user!.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateProfilingHandler(req: AuthRequest, res: Response) {
  try {
    await updateProfiling(req.user!.uid, req.body);
    return res.json({ message: "Profile updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
