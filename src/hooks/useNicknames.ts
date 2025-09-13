import { useState, useEffect } from 'react'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface UserNickname {
    uid: string
    nickname: string
    displayName: string
}

export function useNicknames() {
    const [nicknames, setNicknames] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        const q = query(collection(db, 'users'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const nicknameMap = new Map<string, string>()

            snapshot.docs.forEach(doc => {
                const data = doc.data()
                nicknameMap.set(doc.id, data.displayName || data.nickname || 'Anonym')
            })

            setNicknames(nicknameMap)
        })

        return () => unsubscribe()
    }, [])

    const getNickname = (userId: string): string => {
        return nicknames.get(userId) || 'Anonym'
    }

    return { nicknames, getNickname }
}