import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import AdminLayout from "@/components/layout/admin/AdminLayout";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Session is already validated/refreshed by middleware's getUser() call.
    // Use getSession() here to avoid a second getUser() which can corrupt cookies.
    const supabase = await getSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('id', session.user.id)
        .single()

    if (!profile || profile.tier !== 'admin') {
        redirect('/')
    }

    return (
        <div>
            <AdminLayout>
                {children}
            </AdminLayout>
        </div>
    );
}
