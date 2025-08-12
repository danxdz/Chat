import { useState, useEffect } from 'react'
import logger from '../utils/logger'

export default function MessageHandler({ 
  gun, 
  user, 
  activeContact,
  onMessageUpdate,
  onDeliveryStatusUpdate
}) {
  const [localMessages, setLocalMessages] = useState([])

  // Send a message
  const sendMessage = async (text, to = 'General', toId = 'general') => {
    if (!text.trim() || !gun || !user) return false

    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const message = {
      id: messageId,
      text: text.trim(),
      from: user.nickname,
      fromId: user.id,
      to,
      toId,
      timestamp: Date.now(),
      type: toId === 'general' ? 'general' : 'private'
    }

    try {
      // Update delivery status
      onDeliveryStatusUpdate(messageId, 'sending')

      // Determine channel
      const channel = toId === 'general' 
        ? 'general_chat'
        : `private_${[user.id, toId].sort().join('_')}`

      // Send to Gun.js
      await gun.get(channel).get(`msg_${messageId}`).put(message)
      
      logger.log('📤 Message sent to Gun.js:', { channel, messageId })
      
      // Update delivery status
      setTimeout(() => {
        onDeliveryStatusUpdate(messageId, 'sent')
        setTimeout(() => {
          onDeliveryStatusUpdate(messageId, 'delivered')
        }, 1000)
      }, 500)

      return true
    } catch (error) {
      logger.error('Failed to send message:', error)
      onDeliveryStatusUpdate(messageId, 'failed')
      return false
    }
  }

  // Listen for messages
  useEffect(() => {
    if (!gun || !user) return

    const channels = ['general_chat']
    const listeners = []

    // Add private channel if there's an active contact
    if (activeContact) {
      const privateChannel = `private_${[user.id, activeContact.id].sort().join('_')}`
      channels.push(privateChannel)
    }

    // Listen to each channel
    channels.forEach(channel => {
      const listener = gun.get(channel).map().on((data, key) => {
        if (!data || !data.id) return
        
        // Validate message
        if (!data.from || !data.text || !data.timestamp) {
          logger.warn('Invalid message structure:', data)
          return
        }

        // Check if it's a new message
        const existingMessage = localMessages.find(m => m.id === data.id)
        if (!existingMessage) {
          logger.log('📨 New message received:', data)
          setLocalMessages(prev => [...prev, data])
          onMessageUpdate(data)
        }
      })

      listeners.push({ channel, listener })
    })

    // Cleanup
    return () => {
      listeners.forEach(({ listener }) => {
        if (listener && listener.off) {
          listener.off()
        }
      })
    }
  }, [gun, user, activeContact])

  return {
    sendMessage,
    messages: localMessages
  }
}

// Hook for using MessageHandler
export function useMessageHandler(props) {
  const [messages, setMessages] = useState([])
  const [deliveryStatus, setDeliveryStatus] = useState({})

  const handler = MessageHandler({
    ...props,
    onMessageUpdate: (message) => {
      setMessages(prev => {
        const exists = prev.find(m => m.id === message.id)
        if (exists) return prev
        return [...prev, message]
      })
    },
    onDeliveryStatusUpdate: (messageId, status) => {
      setDeliveryStatus(prev => ({
        ...prev,
        [messageId]: status
      }))
    }
  })

  return {
    messages,
    deliveryStatus,
    sendMessage: handler.sendMessage
  }
}