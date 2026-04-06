export function getAge(birthday: string): number {
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function getAgeGroup(birthday: string): string {
  const age = getAge(birthday)
  if (age >= 15 && age <= 17) return 'Child Youth (15-17)'
  if (age >= 18 && age <= 24) return 'Core Youth (18-24)'
  if (age >= 25 && age <= 30) return 'Adult Youth (25-30)'
  return 'Unknown'
}

export function getAgeGroupCode(birthday: string): 'child_youth' | 'core_youth' | 'adult_youth' | 'unknown' {
  const age = getAge(birthday)
  if (age >= 15 && age <= 17) return 'child_youth'
  if (age >= 18 && age <= 24) return 'core_youth'
  if (age >= 25 && age <= 30) return 'adult_youth'
  return 'unknown'
}
