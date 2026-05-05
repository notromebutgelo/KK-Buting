import { create } from 'zustand'

export interface UserProfile {
  userId: string
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  gender: string
  age: number
  birthday: string
  email: string
  contactNumber: string
  digitalIdEmergencyContactName?: string
  digitalIdEmergencyContactRelationship?: string
  digitalIdEmergencyContactPhone?: string
  digitalIdEmergencyContactComplete?: boolean
  digitalIdSignatureUrl?: string | null
  digitalIdSignatureSignedAt?: string | null
  digitalIdSignatureComplete?: boolean
  region: string
  province: string
  city: string
  barangay: string
  purok: string
  civilStatus: string
  youthAgeGroup: string
  educationalBackground: string
  youthClassification: string
  workStatus: string
  registeredSkVoter: boolean
  votedLastSkElections: boolean
  registeredNationalVoter: boolean
  attendedKkAssembly: boolean
  kkAssemblyTimesAttended: number
  kkAssemblyReason?: string
  documentsSubmitted?: boolean
  verificationQueueStatus?: 'pending' | 'in_review' | 'resubmission_requested' | 'verified' | 'rejected'
  verificationResubmissionMessage?: string
  verificationRejectReason?: string
  verificationRejectNote?: string
  idPhotoUrl?: string | null
  status: 'pending' | 'verified' | 'rejected'
  submittedAt: string
  verifiedAt?: string
  verified: boolean
}

interface UserState {
  profile: UserProfile | null
  isLoading: boolean
  setProfile: (profile: UserProfile | null) => void
  setLoading: (v: boolean) => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}))
