import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Header from "@/components/header"
import Footer from "@/components/footer"
import {
  LineChartIcon as ChartLine,
  Hospital,
  School,
  ShieldCheck,
  ShoppingCart,
  FolderSyncIcon as Sync,
  University,
  UserCheck,
  ClockIcon as UserClock,
  UserCogIcon as UsersCog,
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="hero-gradient py-8 md:py-16">
        <div className="container mx-auto px-4 flex flex-wrap items-center">
          <div className="w-full lg:w-1/2 p-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(var(--deep-blue))] mb-4">
              Secure Your Systems with Role-Based Access Control
            </h1>
            <p className="text-gray-600 mb-6 text-lg">
              AccessGuard provides enterprise-grade RBAC solutions that streamline permissions management, enhance
              security, and ensure compliance all through an intuitive interface.
            </p>
            <Button asChild size="lg" className="bg-[hsl(var(--deep-blue))] hover:bg-[hsl(var(--deep-blue))/90]">
              <Link href="/auth">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Get Started
              </Link>
            </Button>
          </div>
          <div className="w-full lg:w-1/2 p-4 flex justify-center">
            <div className="rounded-lg shadow-xl overflow-hidden">
              <img src="https://rbacindb.vercel.app/images/das.png" alt="RBAC Dashboard Mockup" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[hsl(var(--deep-blue))] mb-12">Powerful RBAC Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShieldCheck />}
              title="Granular Permissions"
              description="Define precise access controls down to individual resources and operations."
            />
            <FeatureCard
              icon={<UsersCog />}
              title="Role Management"
              description="Create, modify and assign roles with customizable permission sets."
            />
            <FeatureCard
              icon={<UserClock />}
              title="Temporary Access"
              description="Grant time-limited permissions for contractors and temporary staff."
            />
            <FeatureCard
              icon={<UserCheck />}
              title="Access Verification"
              description="Real-time permission checks with minimal performance impact."
            />
            <FeatureCard
              icon={<ChartLine />}
              title="Audit Logging"
              description="Comprehensive logs of all permission changes and access attempts."
            />
            <FeatureCard
              icon={<Sync />}
              title="SSO Integration"
              description="Seamlessly connect with your existing identity providers."
            />
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 bg-[hsl(var(--pastel-green))]">
        <div className="container mx-auto px-4 flex flex-wrap items-center">
          <div className="w-full lg:w-1/2 p-4">
            <h3 className="text-2xl md:text-3xl font-bold text-[hsl(var(--deep-blue))] mb-4">
              Enterprise-Ready Security
            </h3>
            <p className="mb-4">
              AccessGuard implements the principle of least privilege, ensuring users have only the permissions they
              need to perform their jobs—nothing more, nothing less.
            </p>
            <p className="mb-4">
              Our platform scales to manage thousands of users and millions of permission checks per second, with
              built-in redundancy and high availability.
            </p>
            <p>
              Comprehensive compliance reporting helps you satisfy SOC 2, HIPAA, GDPR, and other regulatory requirements
              with just a few clicks.
            </p>
          </div>
          <div className="w-full lg:w-1/2 p-4 flex justify-center">
            <div className="rounded-lg shadow-xl overflow-hidden">
              <img
                src="https://rbacindb.vercel.app/images/usermanagement.png"
                alt="RBAC Security Dashboard"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[hsl(var(--deep-blue))] mb-12">Common Use Cases</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UseCaseCard
              icon={<Hospital />}
              title="Healthcare"
              description="Ensure physicians, nurses, and administrative staff have appropriate access to patient data while maintaining HIPAA compliance."
            />
            <UseCaseCard
              icon={<University />}
              title="Financial Services"
              description="Control access to sensitive financial information with audit trails that satisfy regulatory requirements."
            />
            <UseCaseCard
              icon={<ShoppingCart />}
              title="E-commerce"
              description="Manage permissions across customer service, inventory management, and administrative functions."
            />
            <UseCaseCard
              icon={<School />}
              title="Education"
              description="Differentiate access between students, faculty, and administrators while protecting student data."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-[hsl(var(--deep-blue))] text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Secure Your Systems?</h2>
          <p className="mb-8 max-w-2xl mx-auto">
            Start implementing role-based access control today and enhance your organization's security posture.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Try AccessGuard Free
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="w-20 h-20 bg-[hsl(var(--light-blue))] rounded-full flex items-center justify-center mx-auto mb-4 text-[hsl(var(--deep-blue))]">
        {icon}
      </div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function UseCaseCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start p-6">
          <div className="mr-4 text-primary text-2xl">{icon}</div>
          <div>
            <h4 className="text-xl font-semibold mb-2">{title}</h4>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
