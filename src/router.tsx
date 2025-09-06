import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, ChatPage, ProfilePage } from './pages'
import { RequireAuth } from './auth'

export const appRouter = createBrowserRouter([
    { path: '/', element: <RequireAuth><ChatPage/></RequireAuth> },
    { path: '/login', element: <LoginPage/> },
    { path: '/profile', element: <RequireAuth><ProfilePage/></RequireAuth> },
    { path: '*', element: <div className="p-6">Oh no… 404 🫠</div> }
])