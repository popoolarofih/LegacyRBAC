import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export default function Header() {
  return (
    <header className="bg-[hsl(var(--light-blue))] py-4 px-8 flex items-center justify-between">
      <div className="font-bold text-xl text-[hsl(var(--deep-blue))]">
        <ShieldCheck className="inline-block mr-2" />
        AccessGuard
      </div>
      <nav className="space-x-6">
        <Link href="#features" className="text-[hsl(var(--deep-blue))] font-medium">
          Features
        </Link>
        <Link href="#use-cases" className="text-[hsl(var(--deep-blue))] font-medium">
          Use Cases
        </Link>
        <Link href="#contact" className="text-[hsl(var(--deep-blue))] font-medium">
          Contact
        </Link>
      </nav>
    </header>
  )
}
