"use client"

import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface EventItemProps {
  id: string
  title: string
  date: Date
  type: string
  location?: string
  onViewDetails?: (id: string) => void
}

export function EventItem({ id, title, date, type, location, onViewDetails }: EventItemProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getEventTimeText = (date: Date) => {
    const now = new Date()
    if (date < now) {
      return <span className="text-muted-foreground">Past event</span>
    }
    return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
  }

  return (
    <div className="flex items-start justify-between border-b pb-4">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{type}</p>
        {location && <p className="text-xs text-muted-foreground">Location: {location}</p>}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{formatDate(date)}</div>
        <div className="text-xs text-muted-foreground mb-2">{getEventTimeText(date)}</div>
        {onViewDetails && (
          <Button variant="outline" size="sm" onClick={() => onViewDetails(id)}>
            View Details
          </Button>
        )}
      </div>
    </div>
  )
}
