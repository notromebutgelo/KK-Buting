import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import {
  getDigitalId,
  getMyVerificationStatus,
  uploadDocument,
  uploadDocumentFromBase64,
} from "./digitalId.service";

export async function getDigitalIdHandler(req: AuthRequest, res: Response) {
  try {
    const id = await getDigitalId(req.user!.uid);
    if (!id) return res.status(404).json({ error: "No profile found" });
    return res.json(id);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function uploadDocumentHandler(req: AuthRequest, res: Response) {
  const { docType, fileUrl, fileData } = req.body;
  if (!docType || (!fileUrl && !fileData)) {
    return res
      .status(400)
      .json({ error: "docType and either fileUrl or fileData are required" });
  }
  try {
    if (fileData) {
      const uploadedUrl = await uploadDocumentFromBase64(
        req.user!.uid,
        docType,
        fileData
      );
      return res.status(201).json({
        message: "Document uploaded",
        fileUrl: uploadedUrl,
      });
    }

    await uploadDocument(req.user!.uid, docType, fileUrl);
    return res.status(201).json({ message: "Document uploaded", fileUrl });
  } catch (err: any) {
    console.error("uploadDocumentHandler error:", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getMyVerificationStatusHandler(req: AuthRequest, res: Response) {
  try {
    const status = await getMyVerificationStatus(req.user!.uid);
    if (!status) return res.status(404).json({ error: "No profile found" });
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
