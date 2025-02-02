'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from "@/lib/utils"

export function EmailVerificationForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [otp, setOtp] = React.useState('')
  const email = searchParams.get('email')

  React.useEffect(() => {
    if (!email) {
      router.push('/signup')
    }
  }, [email, router])

  async function verifyEmail() {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: otp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      toast.success('Email verified successfully')
      router.push('/login')
    } catch (error) {
      console.error('Verification error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to verify email')
    } finally {
      setIsLoading(false)
    }
  }

  async function resendVerificationCode() {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code')
      }

      toast.success('Verification code resent to your email')
    } catch (error) {
      console.error('Resend error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <CardHeader className="px-0">
              <CardTitle>Verify your email</CardTitle>
              <CardDescription>
                We&apos;ve sent a verification code to {email}. Enter the code below to verify your email address.
              </CardDescription>
            </CardHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Input
                  id="otp"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <Button
                onClick={verifyEmail}
                className="w-full"
                disabled={isLoading || !otp}
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={resendVerificationCode}
                  disabled={isLoading}
                >
                  Resend verification code
                </Button>
              </div>
            </div>
          </div>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0">
              <Image
                src="/images/verify-bg.jpg"
                alt="Verify email background"
                fill
                priority
                className="object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
