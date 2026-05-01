'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import api from '@/lib/api'
import LoadingModal from '@/components/ui/LoadingModal'
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
  firstName: '', middleName: '', lastName: '', suffix: '', birthday: '', age: '', gender: '',
  civilStatus: '', contactNumber: '', region: '', province: '', city: '', barangay: '', purok: '',
  yearsInBarangay: '', youthAgeGroup: '', educationalBackground: '', youthClassification: '',
  workStatus: '', registeredSkVoter: '', votedLastSkElections: '', registeredNationalVoter: '',
  attendedKkAssembly: '', kkAssemblyTimesAttended: '',
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
  const [loadingTitle, setLoadingTitle] = useState('Saving youth record')

  const profile = member?.profile || {}
  const isSuperadmin = adminRole === 'superadmin'
  const headerStatus = useMemo(() => profile.status || member?.verificationStatus || 'pending', [member?.verificationStatus, profile.status])

  const loadMember = async () => {
    setIsLoading(true)
    try {
      const [memberRes, meRes] = await Promise.all([api.get(`/admin/youth/${userId}`), api.get('/auth/me')])
      const nextMember = memberRes.data.user || memberRes.data
      setMember(nextMember)
      setStatusDraft(nextMember.profile?.status || 'pending')
      setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
      setEditForm({
        firstName: nextMember.profile?.firstName || '', middleName: nextMember.profile?.middleName || '',
        lastName: nextMember.profile?.lastName || '', suffix: nextMember.profile?.suffix || '',
        birthday: normalizeDate(nextMember.profile?.birthday), age: nextMember.profile?.age ? String(nextMember.profile.age) : '',
        gender: nextMember.profile?.gender || '', civilStatus: nextMember.profile?.civilStatus || '',
        contactNumber: nextMember.profile?.contactNumber || '', region: nextMember.profile?.region || '',
        province: nextMember.profile?.province || '', city: nextMember.profile?.city || '',
        barangay: nextMember.profile?.barangay || '', purok: nextMember.profile?.purok || '',
        yearsInBarangay: nextMember.profile?.yearsInBarangay || '', youthAgeGroup: nextMember.profile?.youthAgeGroup || '',
        educationalBackground: nextMember.profile?.educationalBackground || '', youthClassification: nextMember.profile?.youthClassification || '',
        workStatus: nextMember.profile?.workStatus || '', registeredSkVoter: normalizeBool(nextMember.profile?.registeredSkVoter),
        votedLastSkElections: normalizeBool(nextMember.profile?.votedLastSkElections), registeredNationalVoter: normalizeBool(nextMember.profile?.registeredNationalVoter),
        attendedKkAssembly: normalizeBool(nextMember.profile?.attendedKkAssembly), kkAssemblyTimesAttended: nextMember.profile?.kkAssemblyTimesAttended ? String(nextMember.profile.kkAssemblyTimesAttended) : '',
      })
    } catch { setMember(null) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadMember() }, [userId])

  const patchForm = (key: string, value: string) => setEditForm((c) => ({ ...c, [key]: value }))

  const handleStatusSave = async () => {
    setLoadingTitle('Saving verification status'); setIsSavingStatus(true); setMessage('')
    try { await api.patch(`/admin/youth/${userId}/status`, { status: statusDraft, reason: statusReason, note: statusNote }); await loadMember(); setMessage('Verification status updated.') }
    catch (error: any) { setMessage(error?.response?.data?.error || 'Failed to update status.') }
    finally { setIsSavingStatus(false) }
  }

  const handleProfileSave = async () => {
    setLoadingTitle('Saving profile changes'); setIsSavingProfile(true); setMessage('')
    try {
      await api.patch(`/admin/youth/${userId}/profile`, { ...editForm, age: editForm.age ? Number(editForm.age) : null, kkAssemblyTimesAttended: editForm.kkAssemblyTimesAttended ? Number(editForm.kkAssemblyTimesAttended) : null, registeredSkVoter: parseBool(editForm.registeredSkVoter), votedLastSkElections: parseBool(editForm.votedLastSkElections), registeredNationalVoter: parseBool(editForm.registeredNationalVoter), attendedKkAssembly: parseBool(editForm.attendedKkAssembly) })
      await loadMember(); setMessage('Youth profile updated.')
    } catch (error: any) { setMessage(error?.response?.data?.error || 'Failed to update profile.') }
    finally { setIsSavingProfile(false) }
  }

  const handlePointsAdjustment = async () => {
    setLoadingTitle('Submitting points adjustment'); setIsAdjustingPoints(true); setMessage('')
    try { await api.post(`/admin/youth/${userId}/points-adjustments`, { amount: Number(pointsAmount), reason: pointsReason }); await loadMember(); setPointsAmount(''); setPointsReason(''); setMessage('Points adjusted successfully.') }
    catch (error: any) { setMessage(error?.response?.data?.error || 'Failed to adjust points.') }
    finally { setIsAdjustingPoints(false) }
  }

  const handleArchive = async () => {
    setLoadingTitle('Archiving youth record'); setIsArchiving(true); setMessage('')
    try { await api.patch(`/admin/youth/${userId}/archive`, { note: archiveNote }); await loadMember(); setMessage('Youth record archived.') }
    catch (error: any) { setMessage(error?.response?.data?.error || 'Failed to archive record.') }
    finally { setIsArchiving(false) }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" /></div>
  if (!member) return <div className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>Member not found.</div>

  return (
    <>
      <LoadingModal open={isSavingStatus || isSavingProfile || isAdjustingPoints || isArchiving} title={loadingTitle} description="Please wait while the member record is updated and the latest profile data is loaded." />
      <div className="flex flex-col gap-5">
        <div className="admin-panel flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors hover:bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{member.fullName || member.UserName}</h1>
                <StatusChip label={headerStatus} tone={headerStatus} />
                {member.isArchived && <StatusChip label="archived" tone="archived" />}
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{member.email} | {profile.contactNumber || 'No contact number'}</p>
              <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>KK ID: {member.idNumber || 'Not generated'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[280px]">
            <SummaryMini label="Points" value={member.points?.totalPoints || 0} />
            <SummaryMini label="Earned" value={member.points?.earnedPoints || 0} />
            <SummaryMini label="Redeemed" value={member.points?.redeemedPoints || 0} />
          </div>
        </div>

        {message && <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>{message}</div>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="flex flex-col gap-5">
            <div className="admin-panel flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                    className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                    style={activeTab === tab.key ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="rounded-[var(--radius-md)] p-5" style={{ background: 'var(--surface-muted)' }}>
                {activeTab === 'personal' && <FieldGrid fields={[['Full Name', member.fullName || member.UserName], ['Birthday', formatDate(profile.birthday)], ['Gender', profile.gender], ['Civil Status', profile.civilStatus], ['Contact Number', profile.contactNumber], ['Email', profile.email || member.email]]} />}
                {activeTab === 'address' && <FieldGrid fields={[['Region', profile.region], ['Province', profile.province], ['City', profile.city], ['Barangay', profile.barangay], ['Purok / Zone', profile.purok], ['Years in Barangay', profile.yearsInBarangay]]} />}
                {activeTab === 'demographics' && <FieldGrid fields={[['Civil Status', profile.civilStatus], ['Age / Age Group', `${profile.age || '-'} / ${profile.youthAgeGroup || '-'}`], ['Education', profile.educationalBackground], ['Classification', profile.youthClassification], ['Work Status', profile.workStatus], ['Profiling Status', member.profilingStatus]]} />}
                {activeTab === 'civic' && <FieldGrid fields={[['Registered SK Voter', formatBool(profile.registeredSkVoter)], ['Voted Last SK Elections', formatBool(profile.votedLastSkElections)], ['Registered National Voter', formatBool(profile.registeredNationalVoter)], ['Attended KK Assembly', formatBool(profile.attendedKkAssembly)], ['KK Assembly Attendance', profile.kkAssemblyTimesAttended], ['Verification Status', profile.status]]} />}
                {activeTab === 'documents' && <ListCardList items={member.documents || []} renderItem={(doc) => (
                  <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
                    <div><p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{String(doc.documentType || 'Document').split('_').join(' ')}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Uploaded {formatDate(doc.uploadedAt)}</p></div>
                    <div className="flex items-center gap-3"><StatusChip label={doc.status || 'pending'} tone={doc.status || 'pending'} />{doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>View File</a>}</div>
                  </div>
                )} emptyText="No uploaded documents found." />}
                {activeTab === 'points' && <ListCardList items={member.pointsHistory || []} renderItem={(entry) => (
                  <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
                    <div><p className="font-semibold capitalize text-sm" style={{ color: 'var(--ink)' }}>{entry.type || 'transaction'}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>{entry.reason || entry.adjustedBy || 'No reason logged'}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>{formatDateTime(entry.createdAt)}</p></div>
                    <p className={cn('text-lg font-bold', (entry.pointsDelta || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{(entry.pointsDelta || 0) >= 0 ? '+' : ''}{entry.pointsDelta || 0}</p>
                  </div>
                )} emptyText="No points history available yet." />}
                {activeTab === 'redemptions' && <ListCardList items={member.redemptions || []} renderItem={(redemption) => (
                  <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
                    <div><p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{redemption.rewardTitle || 'Reward'}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Redeemed {formatDateTime(redemption.redeemedAt)}</p></div>
                    <div className="flex items-center gap-3"><StatusChip label={redemption.status || 'claimed'} tone={redemption.status || 'verified'} /><p className="font-bold text-sm" style={{ color: 'var(--accent-strong)' }}>{redemption.pointsUsed || 0} pts</p></div>
                  </div>
                )} emptyText="No reward redemptions found." />}
              </div>
            </div>

            <ActionCard title="Edit Youth Profile">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InputField label="First Name" value={editForm.firstName} onChange={(v) => patchForm('firstName', v)} />
                <InputField label="Middle Name" value={editForm.middleName} onChange={(v) => patchForm('middleName', v)} />
                <InputField label="Last Name" value={editForm.lastName} onChange={(v) => patchForm('lastName', v)} />
                <InputField label="Suffix" value={editForm.suffix} onChange={(v) => patchForm('suffix', v)} />
                <InputField label="Birthday" type="date" value={editForm.birthday} onChange={(v) => patchForm('birthday', v)} />
                <InputField label="Age" type="number" value={editForm.age} onChange={(v) => patchForm('age', v)} />
                <InputField label="Gender" value={editForm.gender} onChange={(v) => patchForm('gender', v)} />
                <InputField label="Civil Status" value={editForm.civilStatus} onChange={(v) => patchForm('civilStatus', v)} />
                <InputField label="Contact Number" value={editForm.contactNumber} onChange={(v) => patchForm('contactNumber', v)} />
                <ReadOnlyField label="Email" value={member.email} />
                <InputField label="Region" value={editForm.region} onChange={(v) => patchForm('region', v)} />
                <InputField label="Province" value={editForm.province} onChange={(v) => patchForm('province', v)} />
                <InputField label="City" value={editForm.city} onChange={(v) => patchForm('city', v)} />
                <InputField label="Barangay" value={editForm.barangay} onChange={(v) => patchForm('barangay', v)} />
                <InputField label="Purok / Zone" value={editForm.purok} onChange={(v) => patchForm('purok', v)} />
                <InputField label="Years in Barangay" value={editForm.yearsInBarangay} onChange={(v) => patchForm('yearsInBarangay', v)} />
                <InputField label="Age Group" value={editForm.youthAgeGroup} onChange={(v) => patchForm('youthAgeGroup', v)} />
                <InputField label="Education" value={editForm.educationalBackground} onChange={(v) => patchForm('educationalBackground', v)} />
                <InputField label="Classification" value={editForm.youthClassification} onChange={(v) => patchForm('youthClassification', v)} />
                <InputField label="Work Status" value={editForm.workStatus} onChange={(v) => patchForm('workStatus', v)} />
                <SelectField label="Registered SK Voter" value={editForm.registeredSkVoter} onChange={(v) => patchForm('registeredSkVoter', v)} />
                <SelectField label="Voted Last SK Elections" value={editForm.votedLastSkElections} onChange={(v) => patchForm('votedLastSkElections', v)} />
                <SelectField label="Registered National Voter" value={editForm.registeredNationalVoter} onChange={(v) => patchForm('registeredNationalVoter', v)} />
                <SelectField label="Attended KK Assembly" value={editForm.attendedKkAssembly} onChange={(v) => patchForm('attendedKkAssembly', v)} />
                <InputField label="KK Assembly Times Attended" type="number" value={editForm.kkAssemblyTimesAttended} onChange={(v) => patchForm('kkAssemblyTimesAttended', v)} />
              </div>
              <button type="button" onClick={handleProfileSave} disabled={isSavingProfile} className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--accent)' }}>{isSavingProfile ? 'Saving profile...' : 'Save Profile Changes'}</button>
            </ActionCard>
          </div>

          <div className="flex flex-col gap-5">
            <ActionCard title="Verification Status">
              <div className="flex flex-col gap-3">
                <SelectStatus value={statusDraft} onChange={(v) => setStatusDraft(v as typeof statusDraft)} />
                <InputField label="Reason Note" value={statusReason} onChange={setStatusReason} />
                <TextAreaField label="Admin Note" value={statusNote} onChange={setStatusNote} />
                <button type="button" onClick={handleStatusSave} disabled={isSavingStatus} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--accent)' }}>{isSavingStatus ? 'Saving...' : 'Save Status'}</button>
                {profile.status === 'pending' && <Link href={`/verification/${member.uid}`} className="block rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>Open Verification Review</Link>}
              </div>
            </ActionCard>

            <ActionCard title="Manual Points Adjustment">
              <div className="flex flex-col gap-3">
                {!isSuperadmin && <GateNotice text="Only superadmins can add or deduct points manually." />}
                <InputField label="Amount" type="number" value={pointsAmount} onChange={setPointsAmount} />
                <TextAreaField label="Reason" value={pointsReason} onChange={setPointsReason} />
                <button type="button" onClick={handlePointsAdjustment} disabled={!isSuperadmin || isAdjustingPoints || !pointsAmount || !pointsReason.trim()} className="w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-[color:var(--accent-soft)] disabled:opacity-60" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>{isAdjustingPoints ? 'Adjusting...' : 'Submit Points Adjustment'}</button>
              </div>
            </ActionCard>

            <ActionCard title="Archive Youth Record">
              <div className="flex flex-col gap-3">
                {!isSuperadmin && <GateNotice text="Only superadmins can archive youth members." />}
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Archive keeps the data but removes the youth from active operational lists.</p>
                <TextAreaField label="Archive Note" value={archiveNote} onChange={setArchiveNote} />
                <button type="button" onClick={handleArchive} disabled={!isSuperadmin || isArchiving || member.isArchived} className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60">{member.isArchived ? 'Already Archived' : isArchiving ? 'Archiving...' : 'Archive Member'}</button>
              </div>
            </ActionCard>
          </div>
        </div>
      </div>
    </>
  )
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-panel">
      <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function FieldGrid({ fields }: { fields: Array<[string, any]> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-[var(--radius-sm)] border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value || '-'}</p>
        </div>
      ))}
    </div>
  )
}

function ListCardList({ items, renderItem, emptyText }: { items: any[]; renderItem: (item: any) => React.ReactNode; emptyText: string }) {
  if (!items.length) return <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>{emptyText}</div>
  return <div className="flex flex-col gap-3">{items.map((item) => <div key={item.id}>{renderItem(item)}</div>)}</div>
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30" /></div>
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30" /></div>
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label><div className="rounded-xl px-4 py-2.5 text-sm" style={{ border: '1px solid var(--stroke)', background: 'var(--surface-muted)', color: 'var(--muted)' }}>{value || '-'}</div></div>
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="surface-input bg-transparent w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
}

function SelectStatus({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Verification Status</label><select value={value} onChange={(e) => onChange(e.target.value)} className="surface-input bg-transparent w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></div>
}

function GateNotice({ text }: { text: string }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{text}</div>
}

function StatusChip({ label, tone }: { label: string; tone: string }) {
  const cls = tone === 'verified' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]' : tone === 'pending' ? 'bg-amber-50 text-amber-700' : tone === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', cls)}>{label}</span>
}

function SummaryMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-sm)] px-3 py-3 text-center" style={{ background: 'var(--accent-soft)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-strong)' }}>{label}</p>
      <p className="mt-1.5 text-xl font-bold" style={{ color: 'var(--accent-strong)' }}>{value.toLocaleString()}</p>
    </div>
  )
}

function formatDate(value?: string) { if (!value) return '-'; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) }
function formatDateTime(value?: string) { if (!value) return '-'; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function formatBool(value?: boolean | string) { if (value === true || value === 'Yes') return 'Yes'; if (value === false || value === 'No') return 'No'; return '-' }
function normalizeBool(value?: boolean | string) { if (value === true || value === 'Yes') return 'Yes'; if (value === false || value === 'No') return 'No'; return '' }
function parseBool(value: string) { if (value === 'Yes') return true; if (value === 'No') return false; return null }
function normalizeDate(value?: string) { if (!value) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; return d.toISOString().slice(0, 10) }
