"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface TaskItemProps {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "overdue"
  dueDate: Date
  priority: "low" | "medium" | "high"
  onView?: (id: string) => void
  onEdit?: (id: string) => void
}

export function TaskItem({ id, title, description, status, dueDate, priority, onView, onEdit }: TaskItemProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      case "overdue":
        return <Badge className="bg-red-500">Overdue</Badge>
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>
      default:
        return <Badge className="bg-blue-500">Low</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getDueText = (date: Date) => {
    const now = new Date()
    if (date < now && status !== "completed") {
      return <span className="text-red-500">Overdue</span>
    }
    return <span>Due {formatDistanceToNow(date, { addSuffix: true })}</span>
  }

  return (
    <div className="flex items-start justify-between border-b pb-4">
      <div className="space-y-1">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2 mt-2">
          {getStatusBadge(status)}
          {getPriorityBadge(priority)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{getDueText(dueDate)}</div>
        <div className="text-xs text-muted-foreground mb-2">{formatDate(dueDate)}</div>
        <div className="flex gap-2 mt-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(id)}>
              View
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
