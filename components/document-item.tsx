"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DocumentItemProps {
  id: string
  title: string
  type: string
  lastModified: Date
  size: string
  onView?: (id: string) => void
  onDownload?: (id: string) => void
}

export function DocumentItem({ id, title, type, lastModified, size, onView, onDownload }: DocumentItemProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getFileIcon = (fileType: string) => {
    // You could expand this to show different icons for different file types
    return <FileText className="h-8 w-8 text-primary" />
  }

  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="flex items-center">
        {getFileIcon(type)}
        <div className="ml-3">
          <h4 className="font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">
            {type} • {size}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-muted-foreground mb-2">
          Modified: {formatDistanceToNow(lastModified, { addSuffix: true })}
        </div>
        <div className="flex gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(id)}>
              View
            </Button>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={() => onDownload(id)}>
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
