/**
 * PersonalInfoForm — name, title, email, phone, location, website, linkedin, photo,
 * plus Europass fields: nationality, dateOfBirth, drivingLicense.
 */

import React from 'react'
import { Input } from '../ui'
import { PhotoUpload } from '../shared/PhotoUpload'
import type { PersonalInfo } from '../../templates'

interface PersonalInfoFormProps {
  value: PersonalInfo
  onChange: (value: PersonalInfo) => void
  readOnly?: boolean
  /** When true, show Europass fields (nationality, date of birth, driving license) */
  showEuropassFields?: boolean
}

export function PersonalInfoForm({ value, onChange, readOnly, showEuropassFields }: PersonalInfoFormProps) {
  const update = (key: keyof PersonalInfo, v: string) => {
    onChange({ ...value, [key]: v })
  }

  const inputClass = readOnly ? 'opacity-60 cursor-not-allowed bg-surface-inset/50' : ''

  return (
    <div className="space-y-3">
      <PhotoUpload
        value={value?.photo ?? ''}
        onChange={v => update('photo', v)}
        readOnly={readOnly}
        label="Profile photo (Europass)"
      />
      <Input
        label="Full Name"
        value={value?.name ?? ''}
        onChange={e => update('name', e.target.value)}
        placeholder="John Doe"
        readOnly={readOnly}
        className={inputClass}
        required
      />
      <Input
        label="Professional Title"
        value={value?.title ?? ''}
        onChange={e => update('title', e.target.value)}
        placeholder="Software Engineer"
        readOnly={readOnly}
        className={inputClass}
      />
      <Input
        label="Email"
        type="email"
        value={value?.email ?? ''}
        onChange={e => update('email', e.target.value)}
        placeholder="john@example.com"
        readOnly={readOnly}
        className={inputClass}
      />
      <Input
        label="Phone"
        value={value?.phone ?? ''}
        onChange={e => update('phone', e.target.value)}
        placeholder="+1 234 567 8900"
        readOnly={readOnly}
        className={inputClass}
      />
      <Input
        label="Location"
        value={value?.location ?? ''}
        onChange={e => update('location', e.target.value)}
        placeholder="San Francisco, CA"
        readOnly={readOnly}
        className={inputClass}
      />
      <Input
        label="Website"
        value={value?.website ?? ''}
        onChange={e => update('website', e.target.value)}
        placeholder="https://johndoe.com"
        readOnly={readOnly}
        className={inputClass}
      />
      <Input
        label="LinkedIn"
        value={value?.linkedin ?? ''}
        onChange={e => update('linkedin', e.target.value)}
        placeholder="https://linkedin.com/in/johndoe"
        readOnly={readOnly}
        className={inputClass}
      />
      {showEuropassFields && (
        <>
          <Input
            label="Nationality"
            value={value?.nationality ?? ''}
            onChange={e => update('nationality', e.target.value)}
            placeholder="e.g. German, French"
            readOnly={readOnly}
            className={inputClass}
          />
          <Input
            label="Date of Birth"
            value={value?.dateOfBirth ?? ''}
            onChange={e => update('dateOfBirth', e.target.value)}
            placeholder="DD/MM/YYYY"
            readOnly={readOnly}
            className={inputClass}
          />
          <Input
            label="Driving License"
            value={value?.drivingLicense ?? ''}
            onChange={e => update('drivingLicense', e.target.value)}
            placeholder="e.g. B (category)"
            readOnly={readOnly}
            className={inputClass}
          />
        </>
      )}
    </div>
  )
}
