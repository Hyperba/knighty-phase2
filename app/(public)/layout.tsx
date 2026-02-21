import NavFootLayout from "@/components/layout/public/NavFootLayout";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <NavFootLayout>
                {children}
            </NavFootLayout>
        </div>
    );
}
