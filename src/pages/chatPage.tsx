import { ChatBoard, ChatBar } from '@/components'

export function ChatPage() {
    return (
        <section className="grid gap-3 py-4">
            <ChatBoard />
            <ChatBar />
        </section>
    )
}
