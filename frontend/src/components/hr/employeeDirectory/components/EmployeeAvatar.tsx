import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/** Fallback is intentionally untinted — photos should be the only colour in a list. */
export function EmployeeAvatar({
    name,
    src,
    className = 'size-9',
}: {
    name: string;
    src?: string;
    className?: string;
}) {
    const initial = name.trim().charAt(0).toUpperCase();

    return (
        <Avatar className={`${className} shrink-0`}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback className="text-sm font-medium text-muted-foreground">
                {initial}
            </AvatarFallback>
        </Avatar>
    );
}
