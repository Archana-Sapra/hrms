import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/**
 * Employee avatar: photo when there is one, initial on a neutral token
 * otherwise.
 *
 * The fallback deliberately carries no per-person tint. It used to pick from a
 * hardcoded `bg-red-500`/`bg-blue-500`/… array, which broke the tokens-only
 * rule and — because those are fixed sRGB values — fought every theme the app
 * ships. Seven saturated circles also out-shouted the names beside them, which
 * are the actual content of the list.
 *
 * With a neutral fallback, real photos are the only saturation in the rail, so
 * they read as identity rather than decoration.
 */
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
