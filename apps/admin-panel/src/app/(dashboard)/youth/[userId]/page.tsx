'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

interface MemberDetail {
  uid: string
  UserName: string
  email: string
  fullName?: string
  idNumber?: string | null
  createdAt: string
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  profilingStatus?: 'completed' | 'incomplete'
  isArchived?: boolean
  profile?: Record<string, any>
  points?: { totalPoints: number; earnedPoints: number; redeemedPoints: number }
  documents?: Array<{ id: string; documentType?: string; fileUrl?: string; uploadedAt?: string; status?: string }>
  pointsHistory?: Array<{ id: string; type?: string; pointsDelta?: number; reason?: string; adjustedBy?: string; createdAt?: string }>
  redemptions?: Array<{ id: string; rewardTitle?: string; pointsUsed?: number; status?: string; redeemedAt?: string }>
}

type TabKey = 'personal' | 'address' | 'demographics' | 'civic' | 'documents' | 'points' | 'redemptions'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'address', label: 'Address' },
  { key: 'demographics', label: 'Demographics' },
  { key: 'civic', label: 'Civic Participation' },
  { key: 'documents', label: 'Uploaded Documents' },
  { key: 'points', label: 'Points History' },
  { key: 'redemptions', label: 'Redemptions' },
]

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  birthday: '',
  age: '',
  gender: '',
  civilStatus: '',
  contactNumber: '',
  region: '',
  province: '',
  city: '',
  barangay: '',
  purok: '',
  yearsInBarangay: '',
  youthAgeGroup: '',
  educationalBackground: '',
  youthClassification: '',
  workStatus: '',
  registeredSkVoter: '',
  votedLastSkElections: '',
  registeredNationalVoter: '',
  attendedKkAssembly: '',
  kkAssemblyTimesAttended: '',
}

export default function YouthDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [statusDraft, setStatusDraft] = useState<'pending' | 'verified' | 'rejected'>('pending')
  const [statusReason, setStatusReason] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [archiveNote, setArchiveNote] = useState('')
  const [message, setMessage] = useState('')
  const [adminRole, setAdminRole] = useState('admin')
  const [editForm, setEditForm] = useState(emptyForm)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const profile = member?.profile || {}
  const isSuperadmin = adminRole === 'superadmin'
  const headerStatus = useMemo(
    () => profile.status || member?.verificationStatus || 'pending',
    [member?.verificationStatus, profile.status]
  )

  const loadMember = async () => {
    setIsLoading(true)
    try {
      const [memberRes, meRes] = await Promise.all([api.get(`/admin/youth/${userId}`), api.get('/auth/me')])
      const nextMember = memberRes.data.user || memberRes.data
      setMember(nextMember)
      setStatusDraft(nextMember.profile?.status || 'pending')
      setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
      setEditForm({
        firstName: nextMember.profile?.firstName || '',
        middleName: nextMember.profile?.middleName || '',
        lastName: nextMember.profile?.lastName || '',
        suffix: nextMember.profile?.suffix || '',
        birthday: normalizeDate(nextMember.profile?.birthday),
        age: nextMember.profile?.age ? String(nextMember.profile.age) : '',
        gender: nextMember.profile?.gender || '',
        civilStatus: nextMember.profile?.civilStatus || '',
        contactNumber: nextMember.profile?.contactNumber || '',
        region: nextMember.profile?.region || '',
        province: nextMember.profile?.province || '',
        city: nextMember.profile?.city || '',
        barangay: nextMember.profile?.barangay || '',
        purok: nextMember.profile?.purok || '',
        yearsInBarangay: nextMember.profile?.yearsInBarangay || '',
        youthAgeGroup: nextMember.profile?.youthAgeGroup || '',
        educationalBackground: nextMember.profile?.educationalBackground || '',
        youthClassification: nextMember.profile?.youthClassification || '',
        workStatus: nextMember.profile?.workStatus || '',
        registeredSkVoter: normalizeBool(nextMember.profile?.registeredSkVoter),
        votedLastSkElections: normalizeBool(nextMember.profile?.votedLastSkElections),
        registeredNationalVoter: normalizeBool(nextMember.profile?.registeredNationalVoter),
        attendedKkAssembly: normalizeBool(nextMember.profile?.attendedKkAssembly),
        kkAssemblyTimesAttended: nextMember.profile?.kkAssemblyTimesAttended ? String(nextMember.profile.kkAssemblyTimesAttended) : '',
      })
    } catch {
      setMember(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMember()
  }, [userId])

  const patchForm = (key: string, value: string) => setEditForm((current) => ({ ...current, [key]: value }))

  const handleStatusSave = async () => {
    setIsSavingStatus(true)
    setMessage('')
    try {
      await api.patch(`/admin/youth/${userId}/status`, { status: statusDraft, reason: statusReason, note: statusNote })
      await loadMember()
      setMessage('Verification status updated.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update status.')
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleProfileSave = async () => {
    setIsSavingProfile(true)
    setMessage('')
    try {
      await api.patch(`/admin/youth/${userId}/profile`, {
        ...editForm,
        age: editForm.age ? Number(editForm.age) : null,
        kkAssemblyTimesAttended: editForm.kkAssemblyTimesAttended ? Number(editForm.kkAssemblyTimesAttended) : null,
        registeredSkVoter: parseBool(editForm.registeredSkVoter),
        votedLastSkElections: parseBool(editForm.votedLastSkElections),
        registeredNationalVoter: parseBool(editForm.registeredNationalVoter),
        attendedKkAssembly: parseBool(editForm.attendedKkAssembly),
      })
      await loadMember()
      setMessage('Youth profile updated.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePointsAdjustment = async () => {
    setIsAdjustingPoints(true)
    setMessage('')
    try {
      await api.post(`/admin/youth/${userId}/points-adjustments`, { amount: Number(pointsAmount), reason: pointsReason })
      await loadMember()
      setPointsAmount('')
      setPointsReason('')
      setMessage('Points adjusted successfully.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to adjust points.')
    } finally {
      setIsAdjustingPoints(false)
    }
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    setMessage('')
    try {
      await api.patch(`/admin/youth/${userId}/archive`, { note: archiveNote })
      await loadMember()
      setMessage('Youth record archived.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to archive record.')
    } finally {
      setIsArchiving(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!member) return <div className="py-20 text-center text-[color:var(--kk-muted)]">Member not found.</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[color:var(--kk-border)] bg-white/95 p-6 shadow-[0_14px_34px_rgba(1,67,132,0.08)] lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--kk-border)] text-[color:var(--kk-primary)] hover:bg-[#eef5fd]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-[color:var(--kk-primary)]">{member.fullName || member.UserName}</h1>
              <StatusChip label={headerStatus} tone={headerStatus} />
              {member.isArchived ? <StatusChip label="archived" tone="archived" /> : null}
            </div>
            <p className="mt-1 text-sm text-[color:var(--kk-muted)]">{member.email} | {profile.contactNumber || 'No contact number'}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">KK ID: {member.idNumber || 'Not generated'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:min-w-[320px]">
          <SummaryMini label="Points" value={member.points?.totalPoints || 0} />
          <SummaryMini label="Earned" value={member.points?.earnedPoints || 0} />
          <SummaryMini label="Redeemed" value={member.points?.redeemedPoints || 0} />
        </div>
      </div>

      {message ? <div className="rounded-xl border border-[color:var(--kk-border)] bg-[#eef5fd] px-4 py-3 text-sm text-[color:var(--kk-primary)]">{message}</div> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-4 shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-colors', activeTab === tab.key ? 'bg-[linear-gradient(90deg,#014384_0%,#0572DC_100%)] text-white' : 'bg-[#f4f7fb] text-[color:var(--kk-muted)] hover:bg-[#eef5fd] hover:text-[color:var(--kk-primary)]')}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-[22px] bg-[#fffaf0] p-5">
              {activeTab === 'personal' ? <FieldGrid fields={[['Full Name', member.fullName || member.UserName], ['Birthday', formatDate(profile.birthday)], ['Gender', profile.gender], ['Civil Status', profile.civilStatus], ['Contact Number', profile.contactNumber], ['Email', profile.email || member.email]]} /> : null}
              {activeTab === 'address' ? <FieldGrid fields={[['Region', profile.region], ['Province', profile.province], ['City', profile.city], ['Barangay', profile.barangay], ['Purok / Zone', profile.purok], ['Years in Barangay', profile.yearsInBarangay]]} /> : null}
              {activeTab === 'demographics' ? <FieldGrid fields={[['Civil Status', profile.civilStatus], ['Age / Age Group', `${profile.age || '-'} / ${profile.youthAgeGroup || '-'}`], ['Education', profile.educationalBackground], ['Classification', profile.youthClassification], ['Work Status', profile.workStatus], ['Profiling Status', member.profilingStatus]]} /> : null}
              {activeTab === 'civic' ? <FieldGrid fields={[['Registered SK Voter', formatBool(profile.registeredSkVoter)], ['Voted Last SK Elections', formatBool(profile.votedLastSkElections)], ['Registered National Voter', formatBool(profile.registeredNationalVoter)], ['Attended KK Assembly', formatBool(profile.attendedKkAssembly)], ['KK Assembly Attendance', profile.kkAssemblyTimesAttended], ['Verification Status', profile.status]]} /> : null}
              {activeTab === 'documents' ? <ListCardList items={member.documents || []} renderItem={(document) => <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--kk-border)] bg-white p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-[color:var(--kk-primary)]">{String(document.documentType || 'Document').split('_').join(' ')}</p><p className="text-sm text-[color:var(--kk-muted)]">Uploaded {formatDate(document.uploadedAt)}</p></div><div className="flex items-center gap-3"><StatusChip label={document.status || 'pending'} tone={document.status || 'pending'} />{document.fileUrl ? <a href={document.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[color:var(--kk-border)] px-3 py-2 text-sm font-semibold text-[color:var(--kk-primary)] hover:bg-[#eef5fd]">View File</a> : null}</div></div>} emptyText="No uploaded documents found." /> : null}
              {activeTab === 'points' ? <ListCardList items={member.pointsHistory || []} renderItem={(entry) => <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--kk-border)] bg-white p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold capitalize text-[color:var(--kk-primary)]">{entry.type || 'transaction'}</p><p className="text-sm text-[color:var(--kk-muted)]">{entry.reason || entry.adjustedBy || 'No reason logged'}</p><p className="text-xs text-[color:var(--kk-muted)]">{formatDateTime(entry.createdAt)}</p></div><p className={cn('text-lg font-black', (entry.pointsDelta || 0) >= 0 ? 'text-[color:var(--kk-primary)]' : 'text-red-600')}>{(entry.pointsDelta || 0) >= 0 ? '+' : ''}{entry.pointsDelta || 0}</p></div>} emptyText="No points history available yet." /> : null}
              {activeTab === 'redemptions' ? <ListCardList items={member.redemptions || []} renderItem={(redemption) => <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--kk-border)] bg-white p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-[color:var(--kk-primary)]">{redemption.rewardTitle || 'Reward'}</p><p className="text-sm text-[color:var(--kk-muted)]">Redeemed {formatDateTime(redemption.redeemedAt)}</p></div><div className="flex items-center gap-3"><StatusChip label={redemption.status || 'claimed'} tone={redemption.status || 'verified'} /><p className="font-black text-[color:var(--kk-primary)]">{redemption.pointsUsed || 0} pts</p></div></div>} emptyText="No reward redemptions found." /> : null}
            </div>
          </div>

          <ActionCard title="Edit Youth Profile">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField label="First Name" value={editForm.firstName} onChange={(value) => patchForm('firstName', value)} />
              <InputField label="Middle Name" value={editForm.middleName} onChange={(value) => patchForm('middleName', value)} />
              <InputField label="Last Name" value={editForm.lastName} onChange={(value) => patchForm('lastName', value)} />
              <InputField label="Suffix" value={editForm.suffix} onChange={(value) => patchForm('suffix', value)} />
              <InputField label="Birthday" type="date" value={editForm.birthday} onChange={(value) => patchForm('birthday', value)} />
              <InputField label="Age" type="number" value={editForm.age} onChange={(value) => patchForm('age', value)} />
              <InputField label="Gender" value={editForm.gender} onChange={(value) => patchForm('gender', value)} />
              <InputField label="Civil Status" value={editForm.civilStatus} onChange={(value) => patchForm('civilStatus', value)} />
              <InputField label="Contact Number" value={editForm.contactNumber} onChange={(value) => patchForm('contactNumber', value)} />
              <ReadOnlyField label="Email" value={member.email} />
              <InputField label="Region" value={editForm.region} onChange={(value) => patchForm('region', value)} />
              <InputField label="Province" value={editForm.province} onChange={(value) => patchForm('province', value)} />
              <InputField label="City" value={editForm.city} onChange={(value) => patchForm('city', value)} />
              <InputField label="Barangay" value={editForm.barangay} onChange={(value) => patchForm('barangay', value)} />
              <InputField label="Purok / Zone" value={editForm.purok} onChange={(value) => patchForm('purok', value)} />
              <InputField label="Years in Barangay" value={editForm.yearsInBarangay} onChange={(value) => patchForm('yearsInBarangay', value)} />
              <InputField label="Age Group" value={editForm.youthAgeGroup} onChange={(value) => patchForm('youthAgeGroup', value)} />
              <InputField label="Education" value={editForm.educationalBackground} onChange={(value) => patchForm('educationalBackground', value)} />
              <InputField label="Classification" value={editForm.youthClassification} onChange={(value) => patchForm('youthClassification', value)} />
              <InputField label="Work Status" value={editForm.workStatus} onChange={(value) => patchForm('workStatus', value)} />
              <SelectField label="Registered SK Voter" value={editForm.registeredSkVoter} onChange={(value) => patchForm('registeredSkVoter', value)} />
              <SelectField label="Voted Last SK Elections" value={editForm.votedLastSkElections} onChange={(value) => patchForm('votedLastSkElections', value)} />
              <SelectField label="Registered National Voter" value={editForm.registeredNationalVoter} onChange={(value) => patchForm('registeredNationalVoter', value)} />
              <SelectField label="Attended KK Assembly" value={editForm.attendedKkAssembly} onChange={(value) => patchForm('attendedKkAssembly', value)} />
              <InputField label="KK Assembly Times Attended" type="number" value={editForm.kkAssemblyTimesAttended} onChange={(value) => patchForm('kkAssemblyTimesAttended', value)} />
            </div>
            <button type="button" onClick={handleProfileSave} disabled={isSavingProfile} className="mt-4 w-full rounded-xl bg-[linear-gradient(90deg,#014384_0%,#0572DC_100%)] py-2.5 font-semibold text-white disabled:opacity-60">{isSavingProfile ? 'Saving profile...' : 'Save Profile Changes'}</button>
          </ActionCard>
        </div>

        <div className="space-y-5">
          <ActionCard title="Verification Status Management">
            <div className="space-y-3">
              <SelectStatus value={statusDraft} onChange={(value) => setStatusDraft(value as typeof statusDraft)} />
              <InputField label="Reason Note" value={statusReason} onChange={setStatusReason} />
              <TextAreaField label="Admin Note" value={statusNote} onChange={setStatusNote} />
              <button type="button" onClick={handleStatusSave} disabled={isSavingStatus} className="w-full rounded-xl bg-[linear-gradient(90deg,#014384_0%,#0572DC_100%)] py-2.5 font-semibold text-white disabled:opacity-60">{isSavingStatus ? 'Saving...' : 'Save Status'}</button>
              {profile.status === 'pending' ? <Link href={`/verification/${member.uid}`} className="block rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-center text-sm font-semibold text-[color:var(--kk-primary)] hover:bg-[#eef5fd]">Open Verification Review</Link> : null}
            </div>
          </ActionCard>

          <ActionCard title="Manual Points Adjustment">
            <div className="space-y-3">
              {!isSuperadmin ? <GateNotice text="Only superadmins can add or deduct points manually." /> : null}
              <InputField label="Amount" type="number" value={pointsAmount} onChange={setPointsAmount} />
              <TextAreaField label="Reason" value={pointsReason} onChange={setPointsReason} />
              <button type="button" onClick={handlePointsAdjustment} disabled={!isSuperadmin || isAdjustingPoints || !pointsAmount || !pointsReason.trim()} className="w-full rounded-xl border border-[color:var(--kk-border)] bg-[#fffaf0] py-2.5 font-semibold text-[color:var(--kk-primary)] disabled:opacity-60">{isAdjustingPoints ? 'Adjusting...' : 'Submit Points Adjustment'}</button>
            </div>
          </ActionCard>

          <ActionCard title="Archive Youth Record">
            <div className="space-y-3">
              {!isSuperadmin ? <GateNotice text="Only superadmins can archive youth members." /> : null}
              <p className="text-sm text-[color:var(--kk-muted)]">Archive keeps the data but removes the youth from active operational lists.</p>
              <TextAreaField label="Archive Note" value={archiveNote} onChange={setArchiveNote} />
              <button type="button" onClick={handleArchive} disabled={!isSuperadmin || isArchiving || member.isArchived} className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 font-semibold text-red-700 disabled:opacity-60">{member.isArchived ? 'Already Archived' : isArchiving ? 'Archiving...' : 'Archive Member'}</button>
            </div>
          </ActionCard>
        </div>
      </div>
    </div>
  )
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_14px_34px_rgba(1,67,132,0.08)]"><h2 className="text-lg font-black text-[color:var(--kk-primary)]">{title}</h2><div className="mt-4">{children}</div></div>
}

function FieldGrid({ fields }: { fields: Array<[string, any]> }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-2xl border border-[color:var(--kk-border)] bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</p><p className="mt-2 text-sm font-semibold text-[color:var(--kk-ink)]">{value || '-'}</p></div>)}</div>
}

function ListCardList({ items, renderItem, emptyText }: { items: any[]; renderItem: (item: any) => React.ReactNode; emptyText: string }) {
  if (!items.length) return <EmptyState text={emptyText} />
  return <div className="space-y-3">{items.map((item) => <div key={item.id}>{renderItem(item)}</div>)}</div>
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm" /></div>
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm" /></div>
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</label><div className="rounded-xl border border-[color:var(--kk-border)] bg-slate-50 px-4 py-2.5 text-sm text-[color:var(--kk-muted)]">{value || '-'}</div></div>
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
}

function SelectStatus({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Verification Status</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm"><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></div>
}

function GateNotice({ text }: { text: string }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{text}</div>
}

function StatusChip({ label, tone }: { label: string; tone: string }) {
  const className = tone === 'verified' ? 'bg-[#eef5fd] text-[color:var(--kk-primary)]' : tone === 'pending' ? 'bg-[#fff3cf] text-[#9b6500]' : tone === 'rejected' ? 'bg-red-100 text-red-700' : tone === 'archived' ? 'bg-slate-100 text-slate-700' : 'bg-[#eef5fd] text-[color:var(--kk-primary)]'
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', className)}>{label}</span>
}

function SummaryMini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[#eef5fd] px-4 py-3 text-center"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</p><p className="mt-2 text-2xl font-black text-[color:var(--kk-primary)]">{value.toLocaleString()}</p></div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[color:var(--kk-border)] bg-white px-4 py-10 text-center text-sm text-[color:var(--kk-muted)]">{text}</div>
}

function formatDate(value?: string) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) }
function formatDateTime(value?: string) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function formatBool(value?: boolean | string) { if (value === true || value === 'Yes') return 'Yes'; if (value === false || value === 'No') return 'No'; return '-' }
function normalizeBool(value?: boolean | string) { if (value === true || value === 'Yes') return 'Yes'; if (value === false || value === 'No') return 'No'; return '' }
function parseBool(value: string) { if (value === 'Yes') return true; if (value === 'No') return false; return null }
function normalizeDate(value?: string) { if (!value) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return date.toISOString().slice(0, 10) }
