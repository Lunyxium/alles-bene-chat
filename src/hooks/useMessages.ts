import { onSnapshot, Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

export function useMessages(q: Query) {
    const [messages, setMessages] = useState<any[]>([])
    useEffect(() => {
        const off = onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        return () => off()
    }, [q])
    return { messages }
}
