import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useMessages } from '@/hooks'
import { db } from '@/lib/firebase'
import { ChatBubble } from './chatBubble'

export function ChatBoard() {
    const q = query(collection(db, 'rooms', 'global', 'messages'), orderBy('createdAt', 'asc'), limit(100))
    const { messages } = useMessages(q)
    return (
        <div className="h-[60vh] overflow-y-auto rounded border p-3">
            {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
        </div>
    )
}
