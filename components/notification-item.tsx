"use client"

import { Bell, AlertCircle, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface NotificationItemProps {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: "info" | "warning" | "success" | "error"
  onMarkAsRead?: (id: string) => void
}

export function NotificationItem({ id, title, message, timestamp, read, type, onMarkAsRead }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="flex gap-3 border-b pb-3">
      <div className="mt-0.5">{getNotificationIcon(type)}</div>
      <div className="flex-1">
        <h4 className={`font-medium ${read ? "text-muted-foreground" : ""}`}>{title}</h4>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(timestamp, { addSuffix: true })}</p>
      </div>
      {!read && onMarkAsRead && (
        <button onClick={() => onMarkAsRead(id)} className="text-xs text-blue-500 hover:text-blue-700">
          Mark as read
        </button>
      )}
      {!read && !onMarkAsRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>}
    </div>
  )
}
