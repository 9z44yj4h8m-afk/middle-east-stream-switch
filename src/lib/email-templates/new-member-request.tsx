import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { name?: string; email?: string; createdAt?: string }

function NewMemberRequest({ name, email, createdAt }: Props) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>طلب إنشاء حساب</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ padding: '24px', maxWidth: '520px' }}>
          <Text style={{ color: '#6D28D9', fontWeight: 700, margin: 0 }}>Almoghani Smarter pro</Text>
          <Heading style={{ color: '#090A18', fontSize: '24px' }}>طلب إنشاء حساب</Heading>
          <Text style={{ color: '#333' }}>اسم العضو: {name || 'غير محدد'}</Text>
          <Text style={{ color: '#333' }}>البريد: {email || 'غير محدد'}</Text>
          <Text style={{ color: '#333' }}>التاريخ: {createdAt || '-'}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewMemberRequest,
  subject: 'طلب إنشاء حساب',
  displayName: 'طلب إنشاء حساب (للمالك)',
  to: 'a0552525337@gmail.com',
  previewData: { name: 'أحمد', email: 'member@example.com', createdAt: '2026-10-06' },
} satisfies TemplateEntry
