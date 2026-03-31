import api from '@/lib/api'

export async function uploadVerificationID(
  file: File,
  docType:
    | 'certificate_of_residency'
    | 'school_id'
    | 'proof_of_voter_registration'
    | 'valid_government_id'
    | 'id_photo'
) {
  const fileData = await readFileAsDataUrl(file)
  try {
    const res = await api.post('/digital-id/documents', {
      docType,
      fileData,
    })

    return res.data
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.error || 'Upload failed. Please try again.'
    )
  }
}

export async function getVerificationStatus() {
  const res = await api.get('/digital-id/verification-status')
  return res.data
}

export async function getDigitalID() {
  const res = await api.get('/digital-id/me')
  return res.data
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
