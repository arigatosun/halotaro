import React from 'react'
import WorkPatternRegistration from '@/sections/Dashboard/reservation/work-pattern-registration'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '勤務パターン登録 | ダッシュボード',
  description: '勤務パターンを登録・管理するページです。',
}

export default function WorkPatternRegistrationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <WorkPatternRegistration />
    </div>
  )
}