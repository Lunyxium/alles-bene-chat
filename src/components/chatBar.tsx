import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db } from '@/lib/firebase'

const schema = z.object({ text: z.string().min(1).max(500) })

export function ChatBar() {
    const form = useForm<{ text: string }>({ resolver: zodResolver(schema), defaultValues: { text: '' } })
    const onSend = form.handleSubmit(async ({ text }) => {
        await addDoc(collection(db, 'rooms', 'global', 'messages'), { text, createdAt: serverTimestamp() })
        form.reset()
    })

    return (
        <FormProvider {...form}>
            <form onSubmit={onSend} className="flex gap-2">
                <input {...form.register('text')} className="flex-1 rounded border px-3 py-2" placeholder="Sag was Nettes…" />
                <button className="rounded border px-3 py-2">Senden</button>
            </form>
        </FormProvider>
    )
}
