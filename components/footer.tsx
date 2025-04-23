import Link from "next/link"
import { FileText, Github, Headphones, Info, Linkedin, Twitter, Youtube } from "lucide-react"

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-800 text-gray-300 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h5 className="font-bold mb-4 flex items-center">
              <Info className="mr-2 h-4 w-4" /> About AccessGuard
            </h5>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white">
                  Our Story
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-4 flex items-center">
              <Headphones className="mr-2 h-4 w-4" /> Support
            </h5>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Community Forum
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-4 flex items-center">
              <FileText className="mr-2 h-4 w-4" /> Resources
            </h5>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white">
                  Implementation Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-4 flex items-center">Connect</h5>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white flex items-center">
                  <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white flex items-center">
                  <Twitter className="mr-2 h-4 w-4" /> Twitter
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white flex items-center">
                  <Github className="mr-2 h-4 w-4" /> GitHub
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white flex items-center">
                  <Youtube className="mr-2 h-4 w-4" /> YouTube
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-4 border-t border-gray-700 text-sm">
          &copy; 2025 AccessGuard. All rights reserved.
          <Link href="#" className="ml-2 hover:text-white">
            Privacy Policy
          </Link>{" "}
          |
          <Link href="#" className="ml-2 hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  )
}
