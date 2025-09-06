export function ChatBubble({ msg }: { msg: any }) {
    return (
        <div className="my-1 text-sm">
            <span className="mr-2 opacity-70">{new Date(msg.createdAt?.toDate?.() ?? Date.now()).toLocaleTimeString()}</span>
            <strong className="mr-2">{msg.nickname ?? 'anon'}</strong>
            <span>{msg.text}</span>
        </div>
    )
}
