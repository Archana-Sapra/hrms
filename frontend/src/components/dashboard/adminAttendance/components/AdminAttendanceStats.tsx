import { Users, UserCheck, UserX, Heart, Calendar } from 'lucide-react';
import type { WindowStats } from '../useAdminAttendanceGrid';

export function AdminAttendanceStats({ stats }: { stats: WindowStats }) {
    return (
        <>
            <div className="flex shrink-0 items-center gap-1 bg-muted/50 px-2 py-1.5 rounded-lg">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground font-medium text-xs sm:text-sm">{stats.total} total</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1.5 rounded-lg">
                <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" aria-hidden="true" />
                <span className="text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm">{stats.present} present</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg">
                <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" aria-hidden="true" />
                <span className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm">{stats.absent} absent</span>
            </div>
            {stats.leave > 0 && (
                <div className="flex shrink-0 items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-1.5 rounded-lg">
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" aria-hidden="true" />
                    <span className="text-purple-600 dark:text-purple-400 font-medium text-xs sm:text-sm">{stats.leave} leave</span>
                </div>
            )}
            {stats.holiday > 0 && (
                <div className="flex shrink-0 items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1.5 rounded-lg">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" aria-hidden="true" />
                    <span className="text-orange-600 dark:text-orange-400 font-medium text-xs sm:text-sm">{stats.holiday} holiday</span>
                </div>
            )}
        </>
    );
}
