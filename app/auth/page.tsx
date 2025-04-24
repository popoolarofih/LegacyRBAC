"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"
import { Eye, EyeOff, Key, ShieldCheck, Users, WifiOff, RefreshCw } from "lucide-react"
import { initializeVerificationCodes, verifyCode } from "@/lib/verification-service"

export default function AuthPage() {
  const router = useRouter()
  const { user, loading, signIn, signUp, resetPassword, authStatus, isOffline, retryConnection } = useAuth()
  const [activeTab, setActiveTab] = useState("login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState("employee")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [isVerified, setIsVerified] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redirected, setRedirected] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [resetForm, setResetForm] = useState({ email: "" })

  // Redirect if already authenticated
  useEffect(() => {
    // If user is authenticated, redirect to appropriate dashboard
    if (authStatus === "authenticated" && user && !redirected) {
      console.log("Auth page: User already authenticated, redirecting based on role", user.role)
      setRedirected(true) // Prevent multiple redirects

      // Add a small delay to ensure state is stable before redirect
      const redirectTimer = setTimeout(() => {
        if (user.role === "admin") {
          router.push("/dashboard")
        } else if (user.role === "manager") {
          router.push("/manager-dashboard")
        } else {
          router.push("/user-dashboard")
        }
      }, 100)

      return () => clearTimeout(redirectTimer)
    }
  }, [user, authStatus, router, redirected])

  // Initialize verification codes when component mounts
  useEffect(() => {
    initializeVerificationCodes()
  }, [])

  // Handle offline status changes
  useEffect(() => {
    if (isOffline) {
      setAlert({
        type: "error",
        message: "You appear to be offline. Some features may be limited.",
      })
    } else if (alert?.message === "You appear to be offline. Some features may be limited.") {
      setAlert(null)
    }
  }, [isOffline, alert])

  const handleRetryConnection = async () => {
    setIsRetrying(true)
    try {
      const success = await retryConnection()
      if (success) {
        setAlert({
          type: "success",
          message: "Successfully reconnected to the server!",
        })
      } else {
        setAlert({
          type: "error",
          message: "Failed to reconnect. Please check your internet connection.",
        })
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: "Failed to reconnect. Please check your internet connection.",
      })
    } finally {
      setIsRetrying(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)
    setIsSubmitting(true)

    try {
      console.log("Attempting to sign in:", loginForm.email)
      await signIn(loginForm.email, loginForm.password)
      setAlert({ type: "success", message: "Login successful! Redirecting..." })
      // No need to manually redirect here as it's handled in the auth context
    } catch (error: any) {
      console.error("Login error:", error)
      setAlert({ type: "error", message: error.message })
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)
    setIsSubmitting(true)

    if (signupForm.password !== signupForm.confirmPassword) {
      setAlert({ type: "error", message: "Passwords do not match" })
      setIsSubmitting(false)
      return
    }

    if ((selectedRole === "admin" || selectedRole === "manager") && !isVerified) {
      setAlert({ type: "error", message: "Please verify your code before signing up" })
      setIsSubmitting(false)
      return
    }

    try {
      console.log("Attempting to sign up:", signupForm.email, "with role:", selectedRole)
      await signUp(signupForm.email, signupForm.password, selectedRole)
      setAlert({ type: "success", message: "Signup successful! Redirecting..." })
      // No need to manually redirect here as it's handled in the auth context
    } catch (error: any) {
      console.error("Signup error:", error)
      setAlert({ type: "error", message: error.message })
      setIsSubmitting(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)
    setIsSubmitting(true)

    try {
      await resetPassword(resetForm.email)
      setAlert({ type: "success", message: "Password reset link sent to your email!" })
      setIsSubmitting(false)
    } catch (error: any) {
      setAlert({ type: "error", message: error.message })
      setIsSubmitting(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...verificationCode]
      newCode[index] = value
      setVerificationCode(newCode)

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.querySelector(`input[name="code-${index + 1}"]`) as HTMLInputElement
        if (nextInput) nextInput.focus()
      }
    }
  }

  const handleVerifyCode = async () => {
    const code = verificationCode.join("")

    try {
      const isValid = await verifyCode(selectedRole, code)

      if (isValid) {
        setIsVerified(true)
        setAlert({
          type: "success",
          message: `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} code verified successfully!`,
        })
      } else {
        setIsVerified(false)
        setAlert({ type: "error", message: "Invalid verification code" })
      }
    } catch (error) {
      setIsVerified(false)
      setAlert({ type: "error", message: "Error verifying code" })
    }
  }

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    setIsVerified(false)
    setVerificationCode(["", "", "", "", "", ""])
    setAlert(null)
  }

  // Show loading state while authentication is being checked
  if (loading || authStatus === "initializing") {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading authentication state...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user is already authenticated and we're waiting for redirect, show a message
  if (user && redirected) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">You are already logged in. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[hsl(var(--light-blue))] py-4 px-8 flex items-center justify-between">
        <div className="font-bold text-xl text-[hsl(var(--deep-blue))]">
          <ShieldCheck className="inline-block mr-2" />
          AccessGuard
        </div>
        <Link href="/" className="text-gray-600">
          Home
        </Link>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <WifiOff className="h-4 w-4 mr-2" />
            <span>You are currently offline. Some features may be limited.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryConnection}
            disabled={isRetrying}
            className="bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-200"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </>
            )}
          </Button>
        </div>
      )}

      {/* Auth Container */}
      <div className="flex-1 flex justify-center items-center p-4 md:p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to AccessGuard</CardTitle>
            <CardDescription>Your complete RBAC solution</CardDescription>
          </CardHeader>

          <CardContent>
            {alert && (
              <Alert variant={alert.type === "error" ? "destructive" : "default"} className="mb-4">
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          disabled={isSubmitting}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Logging in..." : "Login"}
                    </Button>

                    <div className="text-center">
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => setActiveTab("reset")}
                        disabled={isSubmitting}
                      >
                        Forgot Password?
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignupSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                          disabled={isSubmitting}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                          disabled={isSubmitting}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isSubmitting}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-2">
                      <Label>Select Your Role</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <RoleOption
                          role="admin"
                          selected={selectedRole === "admin"}
                          onClick={() => handleRoleSelect("admin")}
                          disabled={isSubmitting}
                        />
                        <RoleOption
                          role="manager"
                          selected={selectedRole === "manager"}
                          onClick={() => handleRoleSelect("manager")}
                          disabled={isSubmitting}
                        />
                        <RoleOption
                          role="employee"
                          selected={selectedRole === "employee"}
                          onClick={() => handleRoleSelect("employee")}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Verification Code Section */}
                    {(selectedRole === "admin" || selectedRole === "manager") && (
                      <div
                        className={`p-4 rounded-lg border-l-4 ${
                          selectedRole === "admin"
                            ? "border-l-[hsl(var(--admin-color))] bg-[hsl(var(--admin-color))/10]"
                            : "border-l-[hsl(var(--manager-color))] bg-[hsl(var(--manager-color))/10]"
                        }`}
                      >
                        <h5 className="font-semibold mb-2 flex items-center">
                          <Key className="mr-2 h-4 w-4" />
                          {selectedRole === "admin" ? "Admin" : "Manager"} Verification Required
                        </h5>
                        <p className="text-sm text-gray-600 mb-4">
                          Enter the 6-digit verification code to continue. This code should have been provided by
                          {selectedRole === "admin" ? " your system administrator." : " your admin."}
                        </p>

                        <div className="flex justify-center gap-2 mb-4">
                          {verificationCode.map((digit, index) => (
                            <Input
                              key={index}
                              type="text"
                              name={`code-${index}`}
                              value={digit}
                              onChange={(e) => handleCodeChange(index, e.target.value)}
                              maxLength={1}
                              className="w-10 h-10 text-center p-0"
                              disabled={isSubmitting || isVerified}
                            />
                          ))}
                        </div>

                        <div className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleVerifyCode}
                            disabled={isSubmitting || isVerified || verificationCode.join("").length !== 6}
                          >
                            {isVerified ? "Verified" : "Verify Code"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        isSubmitting || ((selectedRole === "admin" || selectedRole === "manager") && !isVerified)
                      }
                    >
                      {isSubmitting ? "Creating Account..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={handleResetSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email"
                        value={resetForm.email}
                        onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send Reset Link"}
                    </Button>

                    <div className="text-center">
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => setActiveTab("login")}
                        disabled={isSubmitting}
                      >
                        Back to Login
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-4 px-8 text-center">
        <p>&copy; 2025 AccessGuard. All rights reserved.</p>
      </footer>
    </div>
  )
}

function RoleOption({
  role,
  selected,
  onClick,
  disabled,
}: {
  role: "admin" | "manager" | "employee"
  selected: boolean
  onClick: () => void
  disabled: boolean
}) {
  const roleConfig = {
    admin: {
      icon: <ShieldCheck className="h-6 w-6 mb-2" />,
      label: "Admin",
      color: "text-[hsl(var(--admin-color))]",
    },
    manager: {
      icon: <Users className="h-6 w-6 mb-2" />,
      label: "Manager",
      color: "text-[hsl(var(--manager-color))]",
    },
    employee: {
      icon: <Key className="h-6 w-6 mb-2" />,
      label: "Employee",
      color: "text-[hsl(var(--employee-color))]",
    },
  }

  return (
    <div
      className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${
        selected
          ? `border-[hsl(var(--${role}-color))] bg-[hsl(var(--${role}-color))/10]`
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className={roleConfig[role].color}>{roleConfig[role].icon}</div>
      <div>{roleConfig[role].label}</div>
    </div>
  )
}
